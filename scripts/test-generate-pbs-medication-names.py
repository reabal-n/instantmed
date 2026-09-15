"""Regression tests for names-only PBS extraction; no network or patient data."""
import csv
import importlib.util
import io
from pathlib import Path
import sys
import unittest
import zipfile

sys.dont_write_bytecode = True

spec = importlib.util.spec_from_file_location("generator", Path(__file__).with_name("generate-pbs-medication-names.py"))
generator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(generator)


class CatalogueExtractionTests(unittest.TestCase):
    def test_keeps_ambiguous_aliases_and_excludes_other_schedules_and_nonmedicines(self):
        tables = {
            "schedules": [
                ["effective_date", "schedule_code", "revision_number"], ["2026-09-01", "1", "1"]],
            "item-atc-relationships": [
                ["schedule_code", "pbs_code", "atc_code"], ["1", "a", "N06AB06"], ["1", "b", "N06AB10"], ["1", "c", "V06DA00"]],
            "items": [
                ["schedule_code", "pbs_code", "drug_name", "brand_name"],
                ["1", "a", "Sertraline", "Shared Brand"], ["1", "a", "Sertraline", "Shared Brand"],
                ["1", "b", "Escitalopram", "Shared Brand"], ["1", "c", "Synthetic food", "Nutrition"],
                ["2", "a", "Wrong schedule", "Wrong Brand"]],
        }
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w") as archive:
            for table, rows in tables.items():
                csv_buffer = io.StringIO()
                csv.writer(csv_buffer).writerows(rows)
                archive.writestr(f"tables_as_csv/{table}.csv", csv_buffer.getvalue())
        with zipfile.ZipFile(buffer) as archive:
            result = generator.build_reference(archive, "2026-09-01")
            self.assertEqual(result["medications"], [
                {"name": "Escitalopram", "brand_names": ["Shared Brand"]},
                {"name": "Sertraline", "brand_names": ["Shared Brand"]},
            ])
            with self.assertRaises(ValueError):
                generator.build_reference(archive, "2026-08-01")


if __name__ == "__main__":
    unittest.main()
