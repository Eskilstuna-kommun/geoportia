import arcpy
from flask import Flask
from flask import request
from flask import jsonify
from waitress import serve
import glob
import os
import logging

logging.basicConfig(filename='log_geoportia_utv.log', format='%(levelname)s %(asctime)s %(message)s', datefmt='%m/%d/%Y %I:%M:%S %p', level=logging.DEBUG)

app = Flask(__name__)

# Folder with connection files
sde_connection_file_dir = r"D:/arcpy_write_api/connectionfiles/"
create_connection_file_dir = f"{sde_connection_file_dir}create/"

logging.info("anslutning klar!")


def connection_file_exists(database):
    return f"{database}.sde" in list(map(os.path.basename, glob.glob(f"{sde_connection_file_dir}*.sde")))

def create_connection_file(database, user, password):
    connection_file = f"{database}.{user}@kartbas.sde"
    arcpy.management.CreateDatabaseConnection(create_connection_file_dir, connection_file, "SQL_SERVER", "kartbas", account_authentication="DATABASE_AUTH", username=user, password=password, database=database, version_type="TRANSACTIONAL")
    return create_connection_file_dir + connection_file

def delete_connection_file(database, user):
    connection_file = f"{database}.{user}@kartbas.sde"
    arcpy.management.Delete(f"{create_connection_file_dir}{connection_file}")
    arcpy.management.Delete(f"{create_connection_file_dir}{database.lower()}.{user.lower()}@kartbas")


@app.post("/sdedatabase")
def get_feature_class_fields():
    data = request.json

    # Returning array
    columns = []

    expected_fields = {
        "database": "Databas saknas",
        "dataset": "Dataset saknas",
        "featureClass": "FeatureClass saknas",
        "adminUser": "Admin-användarnamn saknas",
        "adminPassword": "Admin-lösenord saknas",
    }

    for expected_field in expected_fields:
        if not data.get(expected_field):
            return jsonify(success = False, message = expected_fields[expected_field], columns = columns)


    success = False
    return_message = ""
    try:
        database = data.get("database")
        dataset = data.get("dataset")
        feature_class = data.get("featureClass")
        database_user = data.get("adminUser")
        password = data.get("adminPassword")

        connection_file_name = create_connection_file(database, database_user, password)
        arcpy.env.workspace = connection_file_name
        arcpy.management.ClearWorkspaceCache()
        datasets = [""] if dataset == "root" else arcpy.ListDatasets(f"*{dataset}", "Feature")

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
                        columns.append({"name": field.name, "type": fieldTypeValue, "length": field.length, "fieldPrecision": field.precision, "fieldScale": field.scale, "aliasName": field.aliasName, "domain": field.domain, "isNullable": str(field.isNullable)})
                        
        arcpy.management.ClearWorkspaceCache()
        success = True
        return
    except Exception as ex:
        template = "An exception of type {0} occurred. Arguments:\n{1!r}"
        return_message = template.format(type(ex).__name__, ex.args)
        success = False
    finally:
        delete_connection_file(database, database_user)
        return jsonify(success = success, message = return_message, columns = columns)


@app.post("/domain")
def get_domain_values():
    data = request.json

    domain_values = []
    domain_parents = []

    expected_fields = {
        "database": "Databas saknas",
        "domain": "Domän saknas",
        "adminUser": "Admin-användarnamn saknas",
        "adminPassword": "Admin-lösenord saknas",
    }

    for expected_field in expected_fields:
        if not data.get(expected_field):
            return jsonify(success = False, message = expected_fields[expected_field], domain_values = domain_values)

    success = False
    return_message = ""
    try:
        database = data.get("database")
        domain = data.get("domain")
        database_user = data.get("adminUser")
        password = data.get("adminPassword")

        create_connection_file(database, database_user, password)
        workspace = f"{create_connection_file_dir}{database}.{database_user}@kartbas.sde"
        arcpy.env.workspace = workspace

        # Return the first matching domain
        domains = arcpy.da.ListDomains(workspace)
        for d in domains:
            if d.name != domain : continue
            
            domain_parents.append({"name": d.name, "domainType": d.domainType, "fieldType": d.type});
            
            if d.domainType != "CodedValue": continue

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
        return jsonify(success = success, message = return_message, domain_values = domain_values, domain_parents = domain_parents)

@app.post("/featureclasses")
def getFeatureClasses ():
    data = request.json
    featureClasses = []

    expected_fields = {
        "database": "Databas saknas",
        "adminUser": "Admin-användarnamn saknas",
        "adminPassword": "Admin-lösenord saknas",
    }

    for expected_field in expected_fields:
        if not data.get(expected_field):
            return jsonify(success = False, message = expected_fields[expected_field], featureClasses = featureClasses)
    
    success = False
    return_message = ""

    try:
        database = data.get("database")
        database_user = data.get("adminUser")
        password = data.get("adminPassword")

        connection_file_name = create_connection_file(database, database_user, password)
        arcpy.env.workspace = connection_file_name
        arcpy.management.ClearWorkspaceCache()
        featureClasses = arcpy.ListFeatureClasses()
        success = True
    except Exception as ex:
        template = "An exception of type {0} occurred. Arguments:\n{1!r}"
        return_message = template.format(type(ex).__name__, ex.args)
        success = False
    finally:
        delete_connection_file(database, database_user)
        return jsonify(success = success, message = return_message, featureClasses = featureClasses)

@app.post("/domains")
def getDomains ():
    data = request.json
    formatedDomains = []

    expected_fields = {
        "database": "Databas saknas",
        "adminUser": "Admin-användarnamn saknas",
        "adminPassword": "Admin-lösenord saknas",
    }

    for expected_field in expected_fields:
        if not data.get(expected_field):
            return jsonify(success = False, message = expected_fields[expected_field], domains = formatedDomains)
    
    success = False
    return_message = ""

    try:
        database = data.get("database")
        database_user = data.get("adminUser")
        password = data.get("adminPassword")

        create_connection_file(database, database_user, password)
        workspace = f"{create_connection_file_dir}{database}.{database_user}@kartbas.sde"
        arcpy.env.workspace = workspace
    
        domains = arcpy.da.ListDomains(workspace)
        for domain in domains:
            formatedDomains.append({ "name": domain.name, "domainType": domain.domainType, "fieldType": domain.type })

        success = True
    except Exception as ex:
        template = "An exception of type {0} occurred. Arguments:\n{1!r}"
        return_message = template.format(type(ex).__name__, ex.args)
        success = False
    finally:
        delete_connection_file(database, database_user)
        return jsonify(success = success, message = return_message, domains = formatedDomains)

if __name__ == "__main__":
    serve(app, host="127.0.0.1", port=8045, threads=512)