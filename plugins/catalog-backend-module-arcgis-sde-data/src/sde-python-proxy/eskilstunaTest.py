import arcpy
from typing import Any
from flask import Flask
from flask import request
from flask import jsonify
from waitress import serve
import logging

logging.basicConfig(
    filename="log_geoportia_utv.log",
    format="%(levelname)s %(asctime)s %(message)s",
    datefmt="%m/%d/%Y %I:%M:%S %p",
    level=logging.DEBUG,
)

app: Flask = Flask(__name__)

# Folder with connection files
sde_file_name = "kartbas.sde" # replace this with the real name of your SDE connection file
workspace_path: str = "L:/Temp/sde_conn/" + sde_file_name

logging.info("anslutning klar!")

@app.post("/sdedatabase")
def get_feature_class_fields():
    data: Any | None = request.json

    # Returning array
    columns: list[dict[str, Any]] = []

    if data is None:
        return jsonify(succcess=False, message="Inga data skickades", columns=columns)

    expected_fields = {
        "database": "Databas saknas",
        "dataset": "Dataset saknas",
        "featureClass": "FeatureClass saknas",
        "adminUser": "Admin-användarnamn saknas",
        "adminPassword": "Admin-lösenord saknas",
    }

    for expected_field in expected_fields:
        if not data.get(expected_field):
            return jsonify(
                success=False, message=expected_fields[expected_field], columns=columns
            )

    success = False
    return_message = ""
    try:
        dataset: str = data.get("dataset")
        feature_class: str = data.get("featureClass")

        arcpy.env.workspace = workspace_path
        arcpy.management.ClearWorkspaceCache()
        datasets = (
            [""] if dataset == "root" else arcpy.ListDatasets(f"*{dataset}", "Feature")
        )

        for ds in datasets:
            feature_classes = arcpy.ListFeatureClasses(feature_dataset=ds)

            if dataset == "root":
                feature_classes = feature_classes + arcpy.ListTables()

            for fc in feature_classes:
                fcList = fc.split(".")
                if fcList[-1] == feature_class:
                    fields = arcpy.ListFields(fc)
                    for field in fields:
                        fieldTypeValue = str(field.type)
                        if "Single" in fieldTypeValue:
                            fieldTypeValue = "Float"
                        columns.append(
                            {
                                "name": field.name,
                                "type": fieldTypeValue,
                                "length": field.length,
                                "fieldPrecision": field.precision,
                                "fieldScale": field.scale,
                                "aliasName": field.aliasName,
                                "domain": field.domain,
                                "isNullable": str(field.isNullable),
                            }
                        )

        arcpy.management.ClearWorkspaceCache()
        success = True
    except Exception as ex:
        template = "An exception of type {0} occurred. Arguments:\n{1!r}"
        return_message = template.format(type(ex).__name__, ex.args)
        success = False
    finally:
        return jsonify(success=success, message=return_message, columns=columns)


@app.post("/domain")
def get_domain_values():
    data: Any | None = request.json

    domain_values: list[dict[str, Any]] = []
    domain_parents: list[dict[str, str]] = []

    if data is None:
        return jsonify(
            succcess=False, message="Inga data skickades", domain_values=domain_values
        )

    expected_fields: dict[str, str] = {
        "database": "Databas saknas",
        "domain": "Domän saknas",
        "adminUser": "Admin-användarnamn saknas",
        "adminPassword": "Admin-lösenord saknas",
    }

    for expected_field in expected_fields:
        if not data.get(expected_field):
            return jsonify(
                success=False,
                message=expected_fields[expected_field],
                domain_values=domain_values,
            )

    success: bool = False
    return_message: str = ""
    try:
        domain: str = data.get("domain")

        arcpy.env.workspace = workspace_path

        # Return the first matching domain
        domains = arcpy.da.ListDomains(workspace_path)
        for d in domains:
            if d.name != domain:
                continue

            domain_parents.append(
                {"name": d.name, "domainType": d.domainType, "fieldType": d.type}
            )
            if d.domainType != "CodedValue":
                continue

            coded_values = d.codedValues
            for val, desc in coded_values.items():
                domain_values.append({"code": val, "description": desc})

            arcpy.management.ClearWorkspaceCache()
            break

        success = True
    except Exception as ex:
        template = "An exception of type {0} occurred. Arguments:\n{1!r}"
        return_message = template.format(type(ex).__name__, ex.args)
        success = False
    finally:
        return jsonify(
            success=success,
            message=return_message,
            domain_values=domain_values,
            domain_parents=domain_parents,
        )


@app.post("/datasets")
def getFeatureClasses():
    data = request.json
    dataSetsWithFeatureClasses: list[dict[str, Any]] = []

    if data is None:
        return jsonify(
            succcess=False,
            message="Inga data skickades",
            datasets=dataSetsWithFeatureClasses,
        )

    expected_fields = {
        "database": "Databas saknas",
        "adminUser": "Admin-användarnamn saknas",
        "adminPassword": "Admin-lösenord saknas",
    }

    for expected_field in expected_fields:
        if not data.get(expected_field):
            return jsonify(
                success=False,
                message=expected_fields[expected_field],
                datasets=dataSetsWithFeatureClasses,
            )

    success = False
    return_message = ""

    try:
        arcpy.env.workspace = workspace_path
        arcpy.management.ClearWorkspaceCache()

        dataSets = arcpy.ListDatasets("*", "Feature")

        # Add the feature classes that belong to no data set
        dataSetsWithFeatureClasses = dataSetsWithFeatureClasses + [
            {
                "name": "root",
                "featureClasses": arcpy.ListFeatureClasses(),
            }
        ]

        for dataSet in dataSets:
            dataSetsWithFeatureClasses = dataSetsWithFeatureClasses + [
                {
                    "name": dataSet,
                    "featureClasses": arcpy.ListFeatureClasses(feature_dataset=dataSet),
                }
            ]

        success = True
    except Exception as ex:
        template = "An exception of type {0} occurred. Arguments:\n{1!r}"
        return_message = template.format(type(ex).__name__, ex.args)
        success = False
    finally:
        return jsonify(
            success=success, message=return_message, datasets=dataSetsWithFeatureClasses
        )


@app.post("/domains")
def getDomains():
    data = request.json
    formatedDomains = []

    if data is None:
        return jsonify(
            succcess=False, message="Inga data skickades", domains=formatedDomains
        )

    expected_fields = {
        "database": "Databas saknas",
        "adminUser": "Admin-användarnamn saknas",
        "adminPassword": "Admin-lösenord saknas",
    }

    for expected_field in expected_fields:
        if not data.get(expected_field):
            return jsonify(
                success=False,
                message=expected_fields[expected_field],
                domains=formatedDomains,
            )

    success = False
    return_message = ""

    try:
        arcpy.env.workspace = workspace_path

        domains = arcpy.da.ListDomains(workspace_path)
        for domain in domains:
            formatedDomains.append(
                {
                    "name": domain.name,
                    "domainType": domain.domainType,
                    "fieldType": domain.type,
                }
            )

        success = True
    except Exception as ex:
        template = "An exception of type {0} occurred. Arguments:\n{1!r}"
        return_message = template.format(type(ex).__name__, ex.args)
        success = False
    finally:
        return jsonify(success=success, message=return_message, domains=formatedDomains)


@app.post("/create-dataset")
def create_dataset():
    data: Any | None = request.json

    if data is None:
        return jsonify(success=False, message="Inga data skickades")

    expected_fields = {
        "database": "Databas saknas",
        "datasetName": "Datasetnamn saknas",
        "adminUser": "Admin-användarnamn saknas",
        "adminPassword": "Admin-lösenord saknas",
    }

    for expected_field in expected_fields:
        if not data.get(expected_field):
            return jsonify(success=False, message=expected_fields[expected_field])

    success = False
    return_message = ""
    try:
        database = data.get("database")
        dataset_name = data.get("datasetName")
        spatial_reference_wkid = data.get("spatialReferenceWkid")

        arcpy.env.workspace = workspace_path
        arcpy.management.ClearWorkspaceCache()

        existing = arcpy.ListDatasets(dataset_name, "Feature") or []
        already_exists = any(
            ds.split(".")[-1].lower() == dataset_name.lower() for ds in existing
        )

        if already_exists:
            return_message = (
                f"Dataset '{dataset_name}' finns redan i databasen '{database}'."
            )
        else:
            spatial_reference = (
                arcpy.SpatialReference(int(spatial_reference_wkid))
                if spatial_reference_wkid is not None
                else None
            )
            arcpy.management.CreateFeatureDataset(
                workspace_path, dataset_name, spatial_reference
            )
            return_message = (
                f"Dataset '{dataset_name}' skapad i databasen '{database}'."
            )

        success = True
    except Exception as ex:
        template = "An exception of type {0} occurred. Arguments:\n{1!r}"
        return_message = template.format(type(ex).__name__, ex.args)
        success = False
    finally:
        return jsonify(success=success, message=return_message)


if __name__ == "__main__":
    serve(app, host="127.0.0.1", port=8045, threads=512)
