from typing import Any
from flask import Flask
from flask import request
from flask import jsonify
from waitress import serve
import logging

# logging.basicConfig(
#     filename="log_geoportia_utv.log",
#     format="%(levelname)s %(asctime)s %(message)s",
#     datefmt="%m/%d/%Y %I:%M:%S %p",
#     level=logging.DEBUG,
# )

app: Flask = Flask(__name__)

# logging.info("anslutning klar!")


@app.post("/sdedatabase")
def get_feature_class_fields():
    data: Any | None = request.json

    # Returning array
    columns: list[dict[str, Any]] = []

    if data is None:
        return jsonify(succcess=False, message="Inga data skickades", columns=columns)

    expected_fields: dict[str, str] = {
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

    columns = [
        {
            "aliasName": "OBJECTID",
            "domain": "",
            "fieldPrecision": 0,
            "fieldScale": 0,
            "isNullable": "False",
            "length": 4,
            "name": "OBJECTID",
            "type": "OID",
        },
        {
            "aliasName": "Shape",
            "domain": "",
            "fieldPrecision": 0,
            "fieldScale": 0,
            "isNullable": "True",
            "length": 0,
            "name": "Shape",
            "type": "Geometry",
        },
        {
            "aliasName": "Shape_Length",
            "domain": "",
            "fieldPrecision": 0,
            "fieldScale": 0,
            "isNullable": "True",
            "length": 8,
            "name": "Shape_Length",
            "type": "Double",
        },
        {
            "aliasName": "Shape_Area",
            "domain": "",
            "fieldPrecision": 0,
            "fieldScale": 0,
            "isNullable": "True",
            "length": 8,
            "name": "Shape_Area",
            "type": "Double",
        },
        {
            "aliasName": "ParcelID",
            "domain": "",
            "fieldPrecision": 0,
            "fieldScale": 0,
            "isNullable": "True",
            "length": 255,
            "name": "ParcelID",
            "type": "String",
        },
        {
            "aliasName": "OwnerName",
            "domain": "",
            "fieldPrecision": 0,
            "fieldScale": 0,
            "isNullable": "True",
            "length": 255,
            "name": "OwnerName",
            "type": "String",
        },
        {
            "aliasName": "LandUseType",
            "domain": "",
            "fieldPrecision": 0,
            "fieldScale": 0,
            "isNullable": "True",
            "length": 2,
            "name": "LandUseType",
            "type": "SmallInteger",
        },
        {
            "aliasName": "AreaSize",
            "domain": "",
            "fieldPrecision": 0,
            "fieldScale": 0,
            "isNullable": "True",
            "length": 8,
            "name": "AreaSize",
            "type": "Double",
        },
    ]

    return jsonify(success=True, message="", columns=columns)


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

    domain_parents = [
        {"domainType": "CodedValue", "fieldType": "Short", "name": "LandUseDomain"}
    ]
    domain_values = [
        {"code": 1, "description": "Residential"},
        {"code": 2, "description": "Commercial"},
        {"code": 3, "description": "Industrial"},
        {"code": 4, "description": "Agricultural"},
    ]

    return jsonify(
        success=True,
        message="",
        domain_values=domain_values,
        domain_parents=domain_parents,
    )


@app.post("/featureclasses")
def getFeatureClasses():
    data: Any | None = request.json
    featureClasses: list[str] = []

    if data is None:
        return jsonify(
            succcess=False, message="Inga data skickades", featureClasses=featureClasses
        )

    expected_fields: dict[str, str] = {
        "database": "Databas saknas",
        "adminUser": "Admin-användarnamn saknas",
        "adminPassword": "Admin-lösenord saknas",
    }

    for expected_field in expected_fields:
        if not data.get(expected_field):
            return jsonify(
                success=False,
                message=expected_fields[expected_field],
                featureClasses=featureClasses,
            )

    featureClasses = ["LandParcels"]

    return jsonify(success=True, message="", featureClasses=featureClasses)


@app.post("/domains")
def getDomains():
    data: Any | None = request.json
    formatedDomains: list[dict[str, str]] = []

    if data is None:
        return jsonify(
            succcess=False, message="Inga data skickades", domains=formatedDomains
        )

    expected_fields: dict[str, str] = {
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

    formatedDomains = [
        {"domainType": "CodedValue", "fieldType": "Short", "name": "LandUseDomain"}
    ]

    return jsonify(success=True, message="", domains=formatedDomains)


if __name__ == "__main__":
    serve(app, host="0.0.0.0", port=8045, threads=512)
