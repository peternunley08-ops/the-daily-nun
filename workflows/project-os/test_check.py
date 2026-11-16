#!/usr/bin/env python3
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from check import load_lessons, main, validate_lessons

ROOT = Path(__file__).resolve().parents[2]
LESSONS = ROOT / "workflows" / "project-os" / "lessons.jsonl"


def lesson(**overrides):
    item = {
        "id": "one-check",
        "date": "2026-11-15",
        "project": "example",
        "claim": "The check held.",
        "evidence": "Ran the check once.",
        "use_when": "Before repeating it.",
        "skip_when": "The source changes.",
        "status": "active",
    }
    item.update(overrides)
    return item


class LessonTests(unittest.TestCase):
    def test_repo_lessons_are_valid(self):
        errors = validate_lessons(load_lessons(LESSONS))
        self.assertEqual(errors, [])

    def test_empty_evidence_is_rejected(self):
        errors = validate_lessons([lesson(evidence="  ")])
        self.assertTrue(any("evidence" in error for error in errors))

    def test_duplicate_active_claim_is_rejected(self):
        errors = validate_lessons([
            lesson(),
            lesson(id="same-claim"),
        ])
        self.assertTrue(any("repeats the active claim" in error for error in errors))

    def test_retired_claim_may_be_restated(self):
        errors = validate_lessons([
            lesson(status="retired"),
            lesson(id="restated"),
        ])
        self.assertEqual(errors, [])

    def test_bad_date_and_status(self):
        errors = validate_lessons([lesson(date="November 15", status="done")])
        self.assertTrue(any("date" in error for error in errors))
        self.assertTrue(any("status" in error for error in errors))


class PackageTests(unittest.TestCase):
    def write_package(self, root, files, extra=None):
        package = root / "package"
        package.mkdir()
        manifest = {"name": "fixture", "version": "0", "files": {}}
        for name, text in files.items():
            path = package / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(text, encoding="utf-8")
            manifest["files"][name] = __import__("hashlib").sha256(text.encode()).hexdigest()
        (package / "MANIFEST.json").write_text(json.dumps(manifest), encoding="utf-8")
        if extra:
            (package / extra).write_text("extra", encoding="utf-8")
        return package

    def repo_with_ignore(self, root, package):
        subprocess.run(["git", "init", "-q"], cwd=root, check=True)
        (root / ".gitignore").write_text(f"/{package.relative_to(root).as_posix()}/\n", encoding="utf-8")
        lessons = root / "lessons.jsonl"
        lessons.write_text(json.dumps(lesson()) + "\n", encoding="utf-8")
        return lessons

    def test_intact_package_exits_zero(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            package = self.write_package(root, {"SKILL.md": "skill"})
            lessons = self.repo_with_ignore(root, package)
            code = main(["--repo", str(root), "--lessons", str(lessons), "--package", str(package)])
            self.assertEqual(code, 0)

    def test_missing_package_exits_two(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            package = root / "missing-package"
            subprocess.run(["git", "init", "-q"], cwd=root, check=True)
            (root / ".gitignore").write_text("/missing-package/\n", encoding="utf-8")
            lessons = root / "lessons.jsonl"
            lessons.write_text(json.dumps(lesson()) + "\n", encoding="utf-8")
            code = main(["--repo", str(root), "--lessons", str(lessons), "--package", str(package)])
            self.assertEqual(code, 2)

    def test_tampered_file_exits_one(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            package = self.write_package(root, {"SKILL.md": "skill"})
            (package / "SKILL.md").write_text("changed", encoding="utf-8")
            lessons = self.repo_with_ignore(root, package)
            code = main(["--repo", str(root), "--lessons", str(lessons), "--package", str(package)])
            self.assertEqual(code, 1)

    def test_bytecode_from_helper_tests_is_not_a_mismatch(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            package = self.write_package(root, {"SKILL.md": "skill"})
            cache = package / "tests" / "__pycache__"
            cache.mkdir(parents=True)
            (cache / "test_skill.cpython-312.pyc").write_bytes(b"bytecode")
            lessons = self.repo_with_ignore(root, package)
            code = main(["--repo", str(root), "--lessons", str(lessons), "--package", str(package)])
            self.assertEqual(code, 0)

    def test_unpackaged_file_exits_one(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            package = self.write_package(root, {"SKILL.md": "skill"}, extra="notes.md")
            lessons = self.repo_with_ignore(root, package)
            code = main(["--repo", str(root), "--lessons", str(lessons), "--package", str(package)])
            self.assertEqual(code, 1)

    def test_this_checkout_when_package_present(self):
        package = ROOT / ".claude" / "skills" / "peter-project-os" / "MANIFEST.json"
        if not package.is_file():
            self.skipTest("private package is not in this checkout")
        code = main(["--repo", str(ROOT)])
        self.assertEqual(code, 0)


if __name__ == "__main__":
    unittest.main()
