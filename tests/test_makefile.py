"""Exercise maintenance commands without cloud credentials or infrastructure."""

from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest


class CleanupTest(unittest.TestCase):
    def test_clean_preserves_infrastructure_state_and_configuration(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            shutil.copyfile(Path(__file__).resolve().parents[1] / "Makefile", root / "Makefile")
            retained = (
                "tofu/terraform.tfstate",
                "tofu/terraform.tfstate.backup",
                "tofu/.terraform.lock.hcl",
                "tofu/backend.hcl",
                "tofu/terraform.tfvars",
            )
            removed = ("tofu/.terraform/providers/cache", "tofu/tfplan", "app/.next/cache")
            for relative in retained + removed:
                path = root / relative
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(f"fixture: {relative}\n")

            subprocess.run(["make", "clean"], cwd=root, check=True, capture_output=True)

            for relative in retained:
                self.assertEqual((root / relative).read_text(), f"fixture: {relative}\n")
            for relative in removed:
                self.assertFalse((root / relative).exists(), relative)


if __name__ == "__main__":
    unittest.main()
