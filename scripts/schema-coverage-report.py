#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKSPACE = ROOT / "data" / "default-workspace.json"

GROUPS = {
    "render3d": [
        "assetType",
        "detailLevel",
        "stylePreset",
        "primaryMaterial",
        "secondaryMaterial",
        "accentMaterial",
        "visibleIn3d",
        "selectableIn3d",
        "childrenMode",
    ],
    "mepMeta": [
        "needsSocket",
        "socketCount",
        "socketHeight",
        "needsSwitch",
        "switchControl",
        "needsLighting",
        "lightingType",
        "lightColorTemperature",
        "needsWaterSupply",
        "waterSupplyType",
        "needsDrainage",
        "drainageType",
        "needsNetwork",
        "needsVentilation",
        "needsSmartControl",
        "relatedCircuit",
        "notes",
    ],
    "constructionMeta": [
        "customMade",
        "installType",
        "reserveSize",
        "wallDependency",
        "floorDependency",
        "ceilingDependency",
        "waterproofRequired",
        "inspectionAccessRequired",
        "purchaseCategory",
        "supplierType",
        "notes",
    ],
    "cameraViews": [
        "id",
        "name",
        "floor",
        "cameraPosition",
        "target",
        "zoom",
        "mode",
        "description",
    ],
}

CONSUMERS = {
    "render3d": {
        "assetType": ("ui", "render", "export"),
        "detailLevel": ("ui", "render", "export"),
        "stylePreset": ("ui", "render", "export"),
        "primaryMaterial": ("ui", "render", "export"),
        "secondaryMaterial": ("ui", "render", "export"),
        "accentMaterial": ("ui", "render", "export"),
        "visibleIn3d": ("ui", "render", "export"),
        "selectableIn3d": ("ui", "render", "export"),
        "childrenMode": ("ui", "render", "export"),
    },
    "mepMeta": {
        field: ("ui", "drawing", "export")
        for field in GROUPS["mepMeta"]
    },
    "constructionMeta": {
        "customMade": ("ui", "drawing", "export"),
        "installType": ("ui", "drawing", "export"),
        "reserveSize": ("ui", "export"),
        "wallDependency": ("ui", "export"),
        "floorDependency": ("ui", "export"),
        "ceilingDependency": ("ui", "drawing", "export"),
        "waterproofRequired": ("ui", "drawing", "export"),
        "inspectionAccessRequired": ("ui", "drawing", "export"),
        "purchaseCategory": ("ui", "export"),
        "supplierType": ("ui", "export"),
        "notes": ("ui", "drawing", "export"),
    },
    "cameraViews": {
        "id": ("export",),
        "name": ("ui", "render", "export"),
        "floor": ("ui", "render", "export"),
        "cameraPosition": ("render", "export"),
        "target": ("render", "export"),
        "zoom": ("render", "export"),
        "mode": ("ui", "render", "export"),
        "description": ("ui", "export"),
    },
}


def present(value):
    return value is not None and value != "" and not (isinstance(value, list) and not value)


def count_furniture_field(furniture, group, field):
    rows = [item for item in furniture if isinstance(item.get(group), dict) and field in item[group]]
    non_empty = [item for item in rows if present(item[group].get(field))]
    return len(rows), len(non_empty)


def count_camera_field(camera_views, field):
    rows = [item for item in camera_views if field in item]
    non_empty = [item for item in rows if present(item.get(field))]
    return len(rows), len(non_empty)


def main():
    workspace = json.loads(WORKSPACE.read_text())
    furniture = workspace.get("furniture", [])
    camera_views = workspace.get("cameraViews", [])
    print("# Schema coverage report")
    print()
    print(f"- furniture objects: {len(furniture)}")
    print(f"- fixed camera views: {len(camera_views)}")
    print()
    print("| group | field | written | non-empty | ui visible | saved | 3d/render | drawing | export | unused |")
    print("|---|---:|---:|---:|---:|---:|---:|---:|---:|---|")
    for group, fields in GROUPS.items():
        total = len(camera_views) if group == "cameraViews" else len(furniture)
        for field in fields:
            written, non_empty = count_camera_field(camera_views, field) if group == "cameraViews" else count_furniture_field(furniture, group, field)
            consumers = set(CONSUMERS[group].get(field, ()))
            ui = written if "ui" in consumers else 0
            saved = written
            render = written if "render" in consumers else 0
            drawing = written if "drawing" in consumers else 0
            export = written if "export" in consumers else 0
            unused = "yes" if not consumers else "no"
            print(f"| {group} | {field} | {written}/{total} | {non_empty}/{total} | {ui}/{total} | {saved}/{total} | {render}/{total} | {drawing}/{total} | {export}/{total} | {unused} |")


if __name__ == "__main__":
    main()
