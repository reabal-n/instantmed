#!/usr/bin/env python3
"""Build a names-only reference from an explicitly downloaded public PBS ZIP.

Usage: python3 scripts/generate-pbs-medication-names.py ARCHIVE YYYY-MM-DD OUTPUT
The official monthly ZIP is linked from https://www.pbs.gov.au/browse/publications.
No clinical, pricing, dose, restriction or patient data is imported.
"""
import csv
import hashlib
import io
import json
from pathlib import Path
import re
import sys
import zipfile


def build_reference(archive, effective_date):
    def table(name):
        return list(csv.DictReader(io.StringIO(archive.read(f"tables_as_csv/{name}.csv").decode("utf-8-sig"))))

    schedules = [row for row in table("schedules") if row["effective_date"] == effective_date]
    if len(schedules) != 1:
        raise ValueError("Expected one explicit schedule; select a reviewed archive/revision")
    schedule = schedules[0]
    code = schedule["schedule_code"]
    # ATC anatomical medicinal groups A-S. Exclude V (various products including
    # dietary supplements and non-therapeutic products) and unclassified items.
    # This bounds reference coverage; it is not an eligibility or safety gate.
    medicinal_items = {row["pbs_code"] for row in table("item-atc-relationships")
                       if row["schedule_code"] == code and re.fullmatch(r"[ABCDGHJLMNPRS]\d{2}[A-Z]{2}\d{2}", row["atc_code"])}
    identities = {}
    for row in table("items"):
        if row["schedule_code"] != code or row["pbs_code"] not in medicinal_items:
            continue
        name, brand = row["drug_name"].strip(), row["brand_name"].strip()
        if not name or name.lower() == "null":
            raise ValueError("Missing drug identity")
        aliases = identities.setdefault(name, set())
        if brand and brand.lower() != "null":
            aliases.add(brand)
    if not identities:
        raise ValueError("No medicinal names in selected schedule")
    return {
        "effectiveDate": effective_date,
        "scheduleCode": code,
        "revision": schedule["revision_number"],
        "source": "https://www.pbs.gov.au/browse/publications",
        "attribution": "PBS Schedule data, Department of Health, Disability and Ageing, Commonwealth of Australia. Names extracted for general reference; no endorsement implied.",
        "scope": "ATC medicinal groups A-S only. Names and aliases are not evidence of current availability, equivalence, PBS eligibility, dose or prescribing suitability.",
        "medications": [{"name": name, "brand_names": sorted(brands)} for name, brands in sorted(identities.items())],
    }


if __name__ == "__main__":
    source, effective, destination = sys.argv[1:]
    with zipfile.ZipFile(source) as archive:
        result = build_reference(archive, effective)
    result["archiveSha256"] = hashlib.sha256(Path(source).read_bytes()).hexdigest()
    Path(destination).write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
