#!/usr/bin/env python3
"""Validate Project OS lessons and the private v1.0.0 package when it is present.

The checker prints claims, not private file text. It does not install, reconstruct,
or score a project.
"""
import argparse
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

REQUIRED = ("id", "date", "project", "claim", "evidence", "use_when", "skip_when", "status")
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
TEXT_LIMIT = 500


def load_lessons(path):
    lessons = []
    text = Path(path).read_text(encoding="utf-8")
    for number, line in enumerate(text.splitlines(), 1):
        if not line.strip():
            continue
        try:
            item = json.loads(line)
        except json.JSONDecodeError as error:
            raise ValueError(f"line {number}: invalid JSON ({error.msg})") from error
        if not isinstance(item, dict):
            raise ValueError(f"line {number}: lesson must be an object")
        lessons.append(item)
    return lessons


def validate_lessons(lessons):
    errors = []
    seen = {}
    claims = {}
    for index, lesson in enumerate(lessons, 1):
        missing = [key for key in REQUIRED if key not in lesson]
        if missing:
            errors.append(f"lesson {index}: missing {', '.join(missing)}")
            continue
        extra = [key for key in lesson if key not in REQUIRED]
        if extra:
            errors.append(f"lesson {index}: unexpected {', '.join(extra)}")
        identifier = lesson["id"]
        if not isinstance(identifier, str) or not SLUG.match(identifier):
            errors.append(f"lesson {index}: id must be a lowercase slug")
        elif identifier in seen:
            errors.append(f"lesson {index}: duplicate id {identifier}")
        else:
            seen[identifier] = index
        if not isinstance(lesson["date"], str) or not DATE.match(lesson["date"]):
            errors.append(f"lesson {index}: date must be YYYY-MM-DD")
        if lesson["status"] not in ("active", "retired"):
            errors.append(f"lesson {index}: status must be active or retired")
        for key in ("project", "claim", "evidence", "use_when", "skip_when"):
            value = lesson[key]
            if not isinstance(value, str) or not value.strip():
                errors.append(f"lesson {index}: {key} needs text")
            elif len(value) > TEXT_LIMIT:
                errors.append(f"lesson {index}: {key} is longer than {TEXT_LIMIT} characters")
        claim = lesson.get("claim")
        if lesson.get("status") == "active" and isinstance(claim, str) and claim.strip():
            if claim in claims:
                errors.append(f"lesson {index}: repeats the active claim from {claims[claim]}")
            else:
                claims[claim] = identifier
    return errors


def package_report(package):
    root = Path(package)
    manifest_path = root / "MANIFEST.json"
    if not manifest_path.is_file():
        return "missing", ["Private package is not in this checkout. Request the authorized archive. Do not reconstruct it."]
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    files = manifest.get("files")
    if not isinstance(files, dict) or not files:
        return "mismatch", ["MANIFEST.json has no files"]
    problems = []
    for rel, digest in files.items():
        path = root / rel
        if not path.is_file():
            problems.append(f"missing {rel}")
            continue
        actual = hashlib.sha256(path.read_bytes()).hexdigest()
        if actual != digest:
            problems.append(f"hash mismatch {rel}")
    expected = set(files) | {"MANIFEST.json"}
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        rel = path.relative_to(root).as_posix()
        if "__pycache__" in rel.split("/") or rel.endswith(".pyc"):
            continue
        if rel not in expected:
            problems.append(f"unpackaged file {rel}")
    if problems:
        return "mismatch", problems
    return "intact", [f"{len(files)} packaged files match {manifest.get('name', 'package')} {manifest.get('version', '')}".strip()]


def gitignore_covers(repo, package):
    rel = Path(package)
    if rel.is_absolute():
        try:
            rel = rel.relative_to(repo)
        except ValueError:
            return False
    target = rel.as_posix()
    if not target.endswith("/"):
        target += "/"
    result = subprocess.run(
        ["git", "check-ignore", "-q", "--", target],
        cwd=repo,
        check=False,
    )
    return result.returncode == 0


def active_lessons(lessons):
    return [lesson for lesson in lessons if lesson.get("status") == "active"]


def main(argv=None):
    parser = argparse.ArgumentParser(description="Check Project OS lessons and the private package.")
    parser.add_argument("--repo", type=Path, default=Path.cwd())
    parser.add_argument("--lessons", type=Path, default=None)
    parser.add_argument("--package", type=Path, default=None)
    args = parser.parse_args(argv)
    repo = args.repo.resolve()
    lessons_path = args.lessons or repo / "workflows" / "project-os" / "lessons.jsonl"
    package = args.package or repo / ".claude" / "skills" / "peter-project-os"
    try:
        lessons = load_lessons(lessons_path)
        errors = validate_lessons(lessons)
    except (OSError, ValueError) as error:
        print(f"lessons: {error}", file=sys.stderr)
        return 1
    if errors:
        print("lessons: invalid", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1
    state, details = package_report(package)
    ignored = gitignore_covers(repo, package)
    active = active_lessons(lessons)
    retired = len(lessons) - len(active)
    print(f"lessons: {len(active)} active, {retired} retired")
    print(f"package: {state}")
    for line in details:
        print(f"- {line}")
    print(f"gitignore: {'ignored' if ignored else 'not ignored'}")
    print("active:")
    for lesson in active:
        print(f"- {lesson['id']}: {lesson['claim']}")
    if not ignored:
        print("gitignore: the private package path is not ignored", file=sys.stderr)
        return 1
    if state == "missing":
        return 2
    if state != "intact":
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
