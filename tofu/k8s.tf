# Kubernetes resources for Elasticsearch on EKS

resource "kubernetes_namespace" "movie_demo" {
  metadata {
    name = var.name
    labels = {
      "app.kubernetes.io/name" = var.name
    }
  }
}

resource "kubernetes_storage_class_v1" "ebs_sc" {
  metadata {
    name = "ebs-sc"
  }
  storage_provisioner    = "ebs.csi.eks.amazonaws.com"
  volume_binding_mode    = "WaitForFirstConsumer"
  reclaim_policy         = "Delete"
  allow_volume_expansion = true
  parameters = {
    type       = "gp3"
    iops       = "10000"
    throughput = "500"
  }
}

resource "kubernetes_service_account_v1" "elasticsearch" {
  metadata {
    name      = "elasticsearch"
    namespace = kubernetes_namespace.movie_demo.metadata[0].name
  }
}

resource "kubernetes_service_v1" "elasticsearch_headless" {
  metadata {
    name      = "elasticsearch-headless"
    namespace = kubernetes_namespace.movie_demo.metadata[0].name
  }
  spec {
    cluster_ip = "None"
    selector = {
      app = "elasticsearch"
    }
    port {
      name = "http"
      port = 9200
    }
    port {
      name = "transport"
      port = 9300
    }
  }
}

resource "kubernetes_stateful_set_v1" "elasticsearch" {
  metadata {
    name      = "elasticsearch"
    namespace = kubernetes_namespace.movie_demo.metadata[0].name
  }

  spec {
    service_name           = kubernetes_service_v1.elasticsearch_headless.metadata[0].name
    replicas               = var.es_replicas
    pod_management_policy  = "Parallel"

    selector {
      match_labels = {
        app = "elasticsearch"
      }
    }

    template {
      metadata {
        labels = {
          app = "elasticsearch"
        }
      }

      spec {
        service_account_name = kubernetes_service_account_v1.elasticsearch.metadata[0].name

        topology_spread_constraint {
          max_skew           = 1
          topology_key       = "kubernetes.io/hostname"
          when_unsatisfiable = "DoNotSchedule"
          label_selector {
            match_labels = {
              app = "elasticsearch"
            }
          }
        }

        init_container {
          name    = "fix-permissions"
          image   = "busybox:1.36"
          command = ["sh", "-c", "chown -R 1000:1000 /usr/share/elasticsearch/data"]
          volume_mount {
            name       = "es-data"
            mount_path = "/usr/share/elasticsearch/data"
          }
          security_context {
            run_as_user = 0
          }
        }

        init_container {
          name    = "increase-vm-max-map"
          image   = "busybox:1.36"
          command = ["sysctl", "-w", "vm.max_map_count=262144"]
          security_context {
            privileged = true
          }
        }

        init_container {
          name  = "init-es-keystore"
          image = "docker.elastic.co/elasticsearch/elasticsearch:${var.es_version}"
          command = ["bash", "-ec"]
          args = [<<-EOT
            if [[ -s /keystore/elasticsearch.keystore ]]; then
              echo "Keystore already exists; skipping"
              exit 0
            fi
            TMP_CONF="$(mktemp -d)"
            export ES_PATH_CONF="$TMP_CONF"
            bin/elasticsearch-keystore create
            cp "$ES_PATH_CONF/elasticsearch.keystore" /keystore/elasticsearch.keystore
            chmod 0600 /keystore/elasticsearch.keystore
            rm -rf "$TMP_CONF"
          EOT
          ]
          volume_mount {
            name       = "es-keystore"
            mount_path = "/keystore"
          }
        }

        container {
          name  = "elasticsearch"
          image = "docker.elastic.co/elasticsearch/elasticsearch:${var.es_version}"

          command = [
            "bash", "-c",
            "exec /usr/local/bin/docker-entrypoint.sh eswrapper"
          ]

          port {
            container_port = 9200
            name           = "http"
          }
          port {
            container_port = 9300
            name           = "transport"
          }

          env {
            name = "node.name"
            value_from {
              field_ref {
                field_path = "metadata.name"
              }
            }
          }
          env {
            name  = "cluster.name"
            value = var.name
          }
          env {
            name  = "discovery.seed_hosts"
            value = join(",", [for i in range(var.es_replicas) : "elasticsearch-${i}.elasticsearch-headless.${var.name}.svc.cluster.local"])
          }
          env {
            name  = "cluster.initial_master_nodes"
            value = join(",", [for i in range(var.es_replicas) : "elasticsearch-${i}"])
          }
          env {
            name  = "xpack.security.enabled"
            value = "false"
          }
          env {
            name  = "xpack.security.http.ssl.enabled"
            value = "false"
          }
          env {
            name  = "xpack.ml.enabled"
            value = "true"
          }
          env {
            name  = "xpack.ml.max_machine_memory_percent"
            value = "60"
          }
          env {
            name  = "ES_JAVA_OPTS"
            value = "-Xms${var.es_heap} -Xmx${var.es_heap}"
          }

          resources {
            requests = {
              cpu    = var.es_cpu
              memory = var.es_memory
            }
            limits = {
              cpu    = var.es_cpu
              memory = var.es_memory
            }
          }

          readiness_probe {
            http_get {
              path = "/_cluster/health?local=true"
              port = 9200
            }
            initial_delay_seconds = 30
            period_seconds        = 10
            timeout_seconds       = 5
          }

          liveness_probe {
            http_get {
              path = "/_cluster/health?local=true"
              port = 9200
            }
            initial_delay_seconds = 90
            period_seconds        = 15
            timeout_seconds       = 5
          }

          volume_mount {
            name       = "es-data"
            mount_path = "/usr/share/elasticsearch/data"
          }

          volume_mount {
            name       = "es-keystore"
            mount_path = "/usr/share/elasticsearch/config/elasticsearch.keystore"
            sub_path   = "elasticsearch.keystore"
          }
        }

        container {
          name  = "refresh-s3-keystore"
          image = "docker.elastic.co/elasticsearch/elasticsearch:${var.es_version}"
          command = ["bash", "-ec"]
          args = [<<-EOT
            set -euo pipefail
            : "$${AWS_CONTAINER_CREDENTIALS_FULL_URI:?missing}"
            : "$${AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE:?missing}"
            while true; do
              TOKEN="$(cat "$AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE")"
              JSON="$(curl -sS -H "Authorization: $TOKEN" "$AWS_CONTAINER_CREDENTIALS_FULL_URI")"
              AK="$(echo "$JSON" | sed -n 's/.*"AccessKeyId"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"
              SK="$(echo "$JSON" | sed -n 's/.*"SecretAccessKey"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"
              ST="$(echo "$JSON" | sed -n 's/.*"Token"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"
              if [[ -z "$AK" || -z "$SK" || -z "$ST" ]]; then
                echo "Failed to parse credentials" >&2
                sleep 10
                continue
              fi
              TMP_CONF="$(mktemp -d)"
              export ES_PATH_CONF="$TMP_CONF"
              cp /usr/share/elasticsearch/config/elasticsearch.keystore "$ES_PATH_CONF/elasticsearch.keystore" || true
              echo -n "$AK" | bin/elasticsearch-keystore add -f -x s3.client.default.access_key
              echo -n "$SK" | bin/elasticsearch-keystore add -f -x s3.client.default.secret_key
              echo -n "$ST" | bin/elasticsearch-keystore add -f -x s3.client.default.session_token
              cp "$ES_PATH_CONF/elasticsearch.keystore" /usr/share/elasticsearch/config/elasticsearch.keystore
              chmod 0600 /usr/share/elasticsearch/config/elasticsearch.keystore
              rm -rf "$TMP_CONF"
              POD_IP="$(hostname -i | awk '{print $1}')"
              until curl -sS -o /dev/null "http://$${POD_IP}:9200"; do sleep 2; done
              curl -sS -X POST "http://$${POD_IP}:9200/_nodes/reload_secure_settings" \
                -H 'Content-Type: application/json' -d '{}' >/dev/null || true
              echo "Credentials refreshed"
              sleep 300
            done
          EOT
          ]

          volume_mount {
            name       = "es-keystore"
            mount_path = "/usr/share/elasticsearch/config/elasticsearch.keystore"
            sub_path   = "elasticsearch.keystore"
          }

          resources {
            requests = {
              cpu    = "100m"
              memory = "128Mi"
            }
            limits = {
              cpu    = "200m"
              memory = "256Mi"
            }
          }
        }

        volume {
          name = "es-keystore"
          empty_dir {}
        }
      }
    }

    volume_claim_template {
      metadata {
        name = "es-data"
      }
      spec {
        storage_class_name = kubernetes_storage_class_v1.ebs_sc.metadata[0].name
        access_modes       = ["ReadWriteOnce"]
        resources {
          requests = {
            storage = var.es_storage_size
          }
        }
      }
    }
  }

  lifecycle {
    # VCT namespace is set by k8s server-side; changes force replacement which is destructive
    ignore_changes = [
      spec[0].volume_claim_template,
      spec[0].template[0].metadata[0].annotations,
    ]
    prevent_destroy = true
  }
}

resource "kubernetes_service_v1" "elasticsearch" {
  metadata {
    name      = "elasticsearch"
    namespace = kubernetes_namespace.movie_demo.metadata[0].name
  }
  spec {
    type = "ClusterIP"
    selector = {
      app = "elasticsearch"
    }
    port {
      name        = "http"
      port        = 9200
      target_port = 9200
    }
  }
}

resource "kubernetes_service_v1" "elasticsearch_nlb" {
  metadata {
    name      = "elasticsearch-nlb"
    namespace = kubernetes_namespace.movie_demo.metadata[0].name
    annotations = {
      "service.beta.kubernetes.io/aws-load-balancer-scheme"         = "internal"
      "service.beta.kubernetes.io/aws-load-balancer-nlb-target-type" = "ip"
    }
  }
  spec {
    type                = "LoadBalancer"
    load_balancer_class = "eks.amazonaws.com/nlb"
    selector = {
      app = "elasticsearch"
    }
    port {
      name        = "http"
      port        = 9200
      target_port = 9200
    }
  }
}
