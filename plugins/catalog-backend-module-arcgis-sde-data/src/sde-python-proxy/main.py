import arcpy
from typing import Any
from flask import Flask
from flask import request
from flask import jsonify
from waitress import serve
import glob
import os
import logging

logging.basicConfig(
    filename="log_geoportia_utv.log",
    format="%(levelname)s %(asctime)s %(message)s",
    datefmt="%m/%d/%Y %I:%M:%S %p",
    level=logging.DEBUG,
)

app: Flask = Flask(__name__)

# Folder with connection files
sde_connection_file_dir: str = r"D:/arcpy_write_api/connectionfiles/"
create_connection_file_dir: str = f"{sde_connection_file_dir}create/"

logging.info("anslutning klar!")


def connection_file_exists(database: str) -> bool:
    return f"{database}.sde" in list(
        map(os.path.basename, glob.glob(f"{sde_connection_file_dir}*.sde"))
    )


def create_connection_file(database: str, user: str, password: str) -> str:
    connection_file: str = f"{database}.{user}@kartbas.sde"
    arcpy.management.CreateDatabaseConnection(
        create_connection_file_dir,
        connection_file,
        "SQL_SERVER",
        "kartbas",
        account_authentication="DATABASE_AUTH",
        username=user,
        password=password,
        database=database,
        version_type="TRANSACTIONAL",
    )
    return f"{create_connection_file_dir}{connection_file}"


def delete_connection_file(database: str, user: str) -> None:
    connection_file: str = f"{database}.{user}@kartbas.sde"
    arcpy.management.Delete(f"{create_connection_file_dir}{connection_file}")
    arcpy.management.Delete(
        f"{create_connection_file_dir}{database.lower()}.{user.lower()}@kartbas"
    )


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
        database: str = data.get("database")
        dataset: str = data.get("dataset")
        feature_class: str = data.get("featureClass")
        database_user: str = data.get("adminUser")
        password: str = data.get("adminPassword")

        connection_file_name: str = create_connection_file(
            database, database_user, password
        )
        arcpy.env.workspace = connection_file_name
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
        delete_connection_file(database, database_user)
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
        database: str = data.get("database")
        domain: str = data.get("domain")
        database_user: str = data.get("adminUser")
        password: str = data.get("adminPassword")

        create_connection_file(database, database_user, password)
        workspace: str = (
            f"{create_connection_file_dir}{database}.{database_user}@kartbas.sde"
        )
        arcpy.env.workspace = workspace

        # Return the first matching domain
        domains = arcpy.da.ListDomains(workspace)
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
        delete_connection_file(database, database_user)
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
        database = data.get("database")
        database_user = data.get("adminUser")
        password = data.get("adminPassword")

        connection_file_name = create_connection_file(database, database_user, password)
        arcpy.env.workspace = connection_file_name
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
        delete_connection_file(database, database_user)
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
        database = data.get("database")
        database_user = data.get("adminUser")
        password = data.get("adminPassword")

        create_connection_file(database, database_user, password)
        workspace = (
            f"{create_connection_file_dir}{database}.{database_user}@kartbas.sde"
        )
        arcpy.env.workspace = workspace

        domains = arcpy.da.ListDomains(workspace)
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
        delete_connection_file(database, database_user)
        return jsonify(success=success, message=return_message, domains=formatedDomains)


if __name__ == "__main__":
    serve(app, host="127.0.0.1", port=8045, threads=512)
