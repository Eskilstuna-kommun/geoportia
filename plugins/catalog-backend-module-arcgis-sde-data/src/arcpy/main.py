import arcpy
from flask import Flask
from flask import request
from flask import jsonify
from waitress import serve
# import glob
# import os
import logging

logging.basicConfig(filename='log_geoportia_utv.log', format='%(levelname)s %(asctime)s %(message)s', datefmt='%m/%d/%Y %I:%M:%S %p', level=logging.DEBUG)

app = Flask(__name__)

# Folder with connection files
# sde_connection_file_dir = r"D:/arcpy_write_api/connectionfiles/"
# create_connection_file_dir = sde_connection_file_dir + "create/"

logging.info("anslutning klar!")


# def connection_file_exists(database):
#     return database + ".sde" in list(map(os.path.basename, glob.glob(sde_connection_file_dir + "*.sde")))

# def create_connection_file(database, user, password):
#     connection_file = database + "." + user + "@kartbas.sde"
#     arcpy.management.CreateDatabaseConnection(create_connection_file_dir, connection_file, "SQL_SERVER", "kartbas", account_authentication="DATABASE_AUTH", username=user, password=password, database=database, version_type="TRANSACTIONAL")
#     return create_connection_file_dir + connection_file

# def delete_connection_file(database, user):
#     connection_file = database + "." + user + "@kartbas.sde"
#     arcpy.management.Delete(create_connection_file_dir + connection_file)
#     arcpy.management.Delete(create_connection_file_dir + database.lower() + "." + user.lower() + "@kartbas")


@app.post("/sdedatabase")
def get_feature_class_fields():
    data = request.json

    # Returning array
    columns = []

    # expected_fields = {
    #     "database": "Databas saknas",
    #     "dataset": "Dataset saknas",
    #     "featureClass": "FeatureClass saknas",
    #     "adminUser": "Admin-användarnamn saknas",
    #     "adminPassword": "Admin-lösenord saknas",
    # }
    expected_fields = {
        "gdbPath": "GDB-sökväg saknas",
        "dataset": "Dataset saknas",
        "featureClass": "FeatureClass saknas",
    }
    for expected_field in expected_fields:
        if not data.get(expected_field):
            return jsonify(success = False, message = expected_fields[expected_field], columns = columns)


    success = False
    return_message = ""
    try:
        #database = data.get("database")
        dataset = data.get("dataset")
        feature_class = data.get("featureClass")
        gdb_path = data.get("gdbPath")
        #database_user = data.get("adminUser")
        #password = data.get("adminPassword")

        # connection_file_name = create_connection_file(database, database_user, password)
        arcpy.env.workspace = gdb_path # connection_file_name
        arcpy.management.ClearWorkspaceCache()
        datasets = [""] if dataset == "root" else arcpy.ListDatasets("*" + dataset, "Feature")

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
        #delete_connection_file(database, database_user)
        return jsonify(success = success, message = return_message, columns = columns)


@app.post("/domain")
def get_domain_values():
    data = request.json

    domain_values = []
    domain_parents = []

    # expected_fields = {
    #     "database": "Databas saknas",
    #     "domain": "Domän saknas",
    #     "adminUser": "Admin-användarnamn saknas",
    #     "adminPassword": "Admin-lösenord saknas",
    # }
    expected_fields = {
        "gdbPath": "GDB-sökväg saknas",
        "domain": "Domän saknas",
    }
    for expected_field in expected_fields:
        if not data.get(expected_field):
            return jsonify(success = False, message = expected_fields[expected_field], domain_values = domain_values)

    success = False
    return_message = ""
    try:
        # database = data.get("database")
        domain = data.get("domain")
        gdb_path = data.get("gdbPath")
        # database_user = data.get("adminUser")
        # password = data.get("adminPassword")

        #create_connection_file(database, database_user, password)
        workspace = gdb_path #create_connection_file_dir + database + "." + database_user + "@kartbas.sde"
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
            return

        success = True
    except Exception as ex:
        template = "An exception of type {0} occurred. Arguments:\n{1!r}"
        return_message = template.format(type(ex).__name__, ex.args)
        success = False
    finally:
        #delete_connection_file(database, database_user)
        return jsonify(success = success, message = return_message, domain_values = domain_values, domain_parents = domain_parents)

# @app.post("/createEnterpriseData")
# def create_enterprise_data():
#     logging.info('/createEnterpriseData')
#     data = request.json

#     expected_fields = {
#         "featureClassName": "FeatureClass-namn saknas",
#         "featureClassAlias": "FeatureClass-alias saknas",
#         "versioningOptionId": "Versioneringsinformation saknas",
#         "databaseName": "Databas-namn saknas",
#         "databaseUser": "Databas-användare saknas",
#         "password": "Lösenord saknas",
#         "datatypeName": "Datatyp saknas",
#         "featureClassFields": "Attribut saknas",
#     }
#     for expected_field in expected_fields:
#         if not data.get(expected_field):
#             return jsonify(success=False, message=expected_fields[expected_field])

#     success = False
#     return_message = ""
#     try:
#         feature_class_name = data.get("featureClassName")
#         feature_class_alias = data.get("featureClassAlias")
#         dataset = data.get("datasetName")
#         versioning_option_id = data.get("versioningOptionId")
#         has_z = data.get("hasZ", False)
#         database = data.get("databaseName")
#         database_user = data.get("databaseUser")
#         password = data.get("password")
#         datatype = data.get("datatypeName")
#         allow_attachments = data.get("allowAttachments", False)
#         feature_class_fields = data.get("featureClassFields")
#         connection_file = database + "." + database_user + "@kartbas.sde"
#         create_connection_file(database, database_user, password)
#         workspace = create_connection_file_dir + connection_file
#         workspace_dataset = workspace + "/" + database + "." + database_user + "." + dataset
#         arcpy.env.workspace = workspace
#         dataset_present = True if dataset else False

#         if dataset_present:
#             result = create_dataset(workspace, dataset, database_user, has_z)
#             if not result["success"]:
#                 success = False
#                 return_message = result["message"]
#                 return

#         # Check if feature_class already exists
#         # TODO: Innan create feature class används kan det vara bra att ställa en fråga till datasetet och se om det är versionerat. Då skulle det i så fall bryta mot en regel mot att icke versionerad data inte får läggas in i versionerade dataset. 
#         existing_feature_class = next((x for x in arcpy.ListFeatureClasses(wild_card="*" + feature_class_name) if x.endswith('.' + feature_class_name)), None)
#         if not existing_feature_class:
#             create_feature_class(workspace, workspace_dataset, feature_class_name, feature_class_alias, datatype, has_z, dataset_present)
#         add_fields(workspace, feature_class_name, feature_class_fields)
#         version_dataset(workspace, dataset_present, dataset, feature_class_name, versioning_option_id, allow_attachments)

#         success = True
#     except Exception as ex:
#         template = "An exception of type {0} occurred. Arguments:\n{1!r}"
#         return_message = template.format(type(ex).__name__, ex.args)
#         if "ERROR 000258" in str(return_message):
#             return_message = "Tabellen existerar redan i Enterprise-databasen"
#         success = False
#     finally:
#         delete_connection_file(database, database_user)
#         return jsonify(success=success, message=return_message)

# def create_dataset(workspace, dataset, database_user, has_z):
#     # Kontrollera att valt dataset finns. Om det inte finns behöver vi skapa upp det
#     # output format: [database].[database_user].[dataset]
#     existing_dataset = next((x for x in arcpy.ListDatasets("*" + dataset, "Feature") if x.endswith('.' + dataset)), None) if arcpy.ListDatasets("*" + dataset, "Feature") else False
#     if not existing_dataset:
#         spatial_reference = get_spatial_reference(has_z)
#         arcpy.management.CreateFeatureDataset(workspace, dataset, spatial_reference)
#         return {"message": "", "success": True}

#     name_split = existing_dataset.split(".")[1]
#     if name_split == "" or name_split == database_user:
#         return {"message": "", "success": True}

#     return {
#         "message": "Databasanvändaren som äger datasetet där geoobjektsklassen ska skapas ägs av en annan dataägare. Datasetet är därför inte kompatibelt för denna dataägare.",
#         "success": False
#     }

# def create_feature_class(workspace, workspace_dataset, feature_class_name, feature_class_alias, datatype, has_z, dataset_present):
#     feature_class_params = {
#         "out_alias": feature_class_alias,
#         "geometry_type": datatype,
#         "has_m": "DISABLED",
#         "has_z": "ENABLED" if has_z else "DISABLED"
#     }

#     if dataset_present:
#         feature_class_params["spatial_reference"] = get_spatial_reference(has_z)
#         arcpy.management.CreateFeatureclass(workspace_dataset, feature_class_name, **feature_class_params)
#         return

#     arcpy.management.CreateFeatureclass(workspace, feature_class_name, **feature_class_params)

# def add_fields(workspace, feature_class_name, feature_class_fields):
#     types_that_cannot_be_deleted = ["OID", "Geometry", "GlobalID"]
#     fields_that_cannot_be_deleted = ["Shape", "Shape.STArea()", "Shape.STLength()", "created_user", "created_date", "last_edited_user", "last_edited_date"]

#     listed_fields = []
#     try:
#         listed_fields = arcpy.ListFields(feature_class_name)
#         fields_to_delete = [f.name for f in listed_fields if f.type not in types_that_cannot_be_deleted and f.name not in fields_that_cannot_be_deleted]
#         if fields_to_delete:
#             arcpy.management.DeleteField(feature_class_name, fields_to_delete)
#     except Exception as listFieldsEx:
#         logging.info("exception while listing fields: " + str(listFieldsEx))
        
#     domains = arcpy.Describe(workspace).domains
#     for feature_class_field in feature_class_fields:
#         field_name = feature_class_field.get("fieldName")
#         field_alias = feature_class_field.get("fieldAlias")
#         field_domain = feature_class_field.get("fieldDomain")
#         field_type = feature_class_field.get("fieldType")
#         field_length = feature_class_field.get("fieldLength")
#         field_precision = feature_class_field.get("fieldPrecision")
#         field_scale = feature_class_field.get("fieldScale")
#         field_is_nullable = feature_class_field.get("fieldIsNullable")

#         if field_type in types_that_cannot_be_deleted or field_name in fields_that_cannot_be_deleted or field_name.lower() == "shape":
#             continue
        
#         # Kontrollera domän, skapa om den inte finns
#         if field_domain and field_domain not in domains:
#             arcpy.management.CreateDomain(workspace, field_domain, field_type=field_type)

#         field_params = {
#             "field_name": field_name,
#             "field_type": field_type,
#             "field_alias": field_alias,
#             "field_is_nullable": field_is_nullable,
#             "field_domain": field_domain
#         }

#         if field_type == "FLOAT" or field_type == "DOUBLE":
#             field_params["field_precision"] = field_precision
#             field_params["field_scale"] = field_scale
#         elif field_type == "SHORT" or field_type == "LONG":
#             field_params["field_precision"] = field_precision
#         else:
#             field_params["field_length"] = field_length

#         arcpy.management.AddField(feature_class_name, **field_params)

# def version_dataset(workspace, dataset_present, dataset, feature_class_name, versioning_option_id, allow_attachments):
#     try:
#         TRADITIONAL_VERSION_ID = 2
#         BRANCH_VERSION_ID = 3
#         if not dataset_present or (versioning_option_id != TRADITIONAL_VERSION_ID and versioning_option_id != BRANCH_VERSION_ID):
#             if allow_attachments:
#                 arcpy.management.EnableAttachments(feature_class_name)
#             return

#         if versioning_option_id == BRANCH_VERSION_ID:
#             arcpy.management.UpdateGeodatabaseConnectionPropertiesToBranch(workspace)

#         add_global_ids_and_fields(dataset, feature_class_name)
#         arcpy.management.RegisterAsVersioned(dataset, edit_to_base="NO_EDITS_TO_BASE")

#         if not allow_attachments:
#             return

#         arcpy.management.EnableAttachments(feature_class_name)
#         add_global_ids_and_fields(feature_class_name + "__ATTACH", feature_class_name + "__ATTACH")
#         arcpy.management.RegisterAsVersioned(feature_class_name + "__ATTACH", edit_to_base="NO_EDITS_TO_BASE")
#     except Exception as ex:
#         template = "An exception of type {0} occurred. Arguments:\n{1!r}"
#         return_message = template.format(type(ex).__name__, ex.args)
#         logging.info("version dataset error: " + str(return_message))

# def add_global_ids_and_fields(in_dataset, in_table):
#     arcpy.management.AddGlobalIDs(in_dataset)
#     arcpy.management.EnableEditorTracking(in_dataset, creator_field="created_user", creation_date_field="created_date", last_editor_field="last_edited_user", last_edit_date_field="last_edited_date", add_fields="ADD_FIELDS", record_dates_in="UTC")

#     field_params = {
#         "created_user": "Skapad av",
#         "created_date": "Skapad",
#         "last_edited_user": "Ändrad av",
#         "last_edited_date": "Ändrad"
#     }
#     existing_fields = [f.name for f in arcpy.ListFields(in_table)]

#     for field in field_params:
#         if field not in existing_fields:
#             arcpy.management.AddField(in_table, field_name=field, field_alias=field_params[field])
#         else:
#             arcpy.management.AlterField(in_table, field, new_field_alias=field_params[field])

# def get_spatial_reference(has_z):
#     if has_z:
#         return "PROJCS['SWEREF99_16_30',GEOGCS['GCS_SWEREF99',DATUM['D_SWEREF99',SPHEROID['GRS_1980',6378137.0,298.257222101]],PRIMEM['Greenwich',0.0],UNIT['Degree',0.0174532925199433]],PROJECTION['Transverse_Mercator'],PARAMETER['False_Easting',150000.0],PARAMETER['False_Northing',0.0],PARAMETER['Central_Meridian',16.5],PARAMETER['Scale_Factor',1.0],PARAMETER['Latitude_Of_Origin',0.0],UNIT['Meter',1.0]],VERTCS['RH2000',VDATUM['Rikets_Hojdsystem_2000'],PARAMETER['Vertical_Shift',0.0],PARAMETER['Direction',1.0],UNIT['Meter',1.0]];-5473200 -10002100 10000;-100000 10000;-100000 10000;0.001;0.001;0.001;IsHighPrecision"
#     return "PROJCS['SWEREF99_16_30',GEOGCS['GCS_SWEREF99',DATUM['D_SWEREF99',SPHEROID['GRS_1980',6378137.0,298.257222101]],PRIMEM['Greenwich',0.0],UNIT['Degree',0.0174532925199433]],PROJECTION['Transverse_Mercator'],PARAMETER['False_Easting',150000.0],PARAMETER['False_Northing',0.0],PARAMETER['Central_Meridian',16.5],PARAMETER['Scale_Factor',1.0],PARAMETER['Latitude_Of_Origin',0.0],UNIT['Meter',1.0]];-5473200 -10002100 10000;-100000 10000;-100000 10000;0.001;0.001;0.001;IsHighPrecision"

# @app.post("/user")
# def create_user_in_enterprise():
#     data = request.json
#     logging.info("create_user_in_enterprise")
#     expected_fields = {
#         "userName": "Användarnamn saknas",
#         "password": "Lösenord saknas",
#         "databases": "Databaser saknas",
#         "adminUser": "Admin-användarnamn saknas",
#         "adminPassword": "Admin-lösenord saknas"
#     }
#     logging.info(data)
#     for expected_field in expected_fields:
#         if not data.get(expected_field):
#             return jsonify(success=False, message=expected_fields[expected_field])

#     user_name = data.get("userName")
#     password = data.get("password")
#     databases = data.get("databases")
#     admin_user = data.get("adminUser")
#     admin_password = data.get("adminPassword")

#     return_values = {
#         "message": "",
#         "success": True
#     }

#     for database in databases:
#         result = create_user_in_database(database, admin_user, admin_password, user_name, password, None)
#         return_values["message"] += result["message"]
#         if not result["success"]:
#             return_values["success"] = False

#     return jsonify(return_values)

# def create_user_in_database(database, admin_user, admin_password, user_name, password, user_role):
#     success = False
#     return_message = ""
#     logging.info("create_user_in_database")
#     try:
#         connection_file = database + "." + admin_user + "@kartbas.sde"
#         create_connection_file(database, admin_user, admin_password)
#         workspace = create_connection_file_dir + connection_file
#         logging.info("Kom hit precis innan arcpy anropet CreateDatabaseUser")
#         # TODO: table space
#         # tablespace_name = ""
#         success = arcpy.management.CreateDatabaseUser(workspace, "DATABASE_USER", user_name, password, user_role, None)
#     except Exception as ex:
#         template = "An exception of type {0} occurred. Arguments:\n{1!r}"
#         return_message = template.format(type(ex).__name__, ex.args)
#         logging.info(return_message)
#         success = False
#     finally:
#         delete_connection_file(database, admin_user)
#         return {
#             "message": return_message,
#             "success": success
#         }

# @app.post("/role")
# def create_role_in_enterprise():
#     data = request.json
#     logging.info("create_role_in_enterprise")
#     expected_fields = {
#         "roleName": "Roll saknas",
#         "databases": "Databaser saknas",
#         "adminUser": "Admin-användarnamn saknas",
#         "adminPassword": "Admin-lösenord saknas"
#     }
#     for expected_field in expected_fields:
#         if not data.get(expected_field):
#             return jsonify(success=False, message=expected_fields[expected_field])

#     role_name = data.get("roleName")
#     users_to_add = data.get("usersToAdd")
#     users_to_revoke = data.get("usersToRevoke")
#     databases = data.get("databases")
#     admin_user = data.get("adminUser")
#     admin_password = data.get("adminPassword")

#     return_values = {
#         "message": "",
#         "success": True
#     }

#     for database in databases:
#         result = create_role_in_database(database, admin_user, admin_password, role_name, users_to_add, users_to_revoke)
#         return_values["message"] += result["message"]
#         if not result["success"]:
#             return_values["success"] = False

#     return jsonify(return_values)

# def create_role_in_database(database, admin_user, admin_password, role_name, users_to_add, users_to_revoke):
#     success = False
#     return_message = ""
#     logging.info("create_role_in_database")
#     try:
#         connection_file = database + "." + admin_user + "@kartbas.sde"
#         create_connection_file(database, admin_user, admin_password)
#         workspace = create_connection_file_dir + connection_file
#         arcpy.env.workspace = workspace
        
#         if len(users_to_revoke) < 2 and len(users_to_add) < 2:
#             try:
#                 success = arcpy.management.CreateRole(workspace, role_name)
#             except Exception as createRoleWithoutMembersEx:
#                 logging.info("could not create role - createRoleWithoutMembersEx: " + str(createRoleWithoutMembersEx));
        
#         if users_to_revoke:
#             for user_to_revoke in users_to_revoke.split(","):
#                 try:
#                     user_to_revoke_full_name = "eskilstuna\{}".format(user_to_revoke)
#                     revoke_result = arcpy.management.CreateRole(workspace, role_name, grant_revoke="REVOKE", user_name=user_to_revoke_full_name)
#                     success = revoke_result
#                 except Exception as evokeEx:
#                     logging.info("66 Got an error while trying tos revoke user: " + str(evokeEx));

#         for user_to_add in users_to_add.split(","):
#             if len(user_to_add) > 0:
#                 full_user_to_add_name = "eskilstuna\{}".format(user_to_add)
#                 try:
#                     arcpy.management.CreateDatabaseUser(workspace, "OPERATING_SYSTEM_USER", full_user_to_add_name)
#                 except Exception as createDbUserEx:
#                     logging.info("Failed to create user because: " + str(createDbUserEx));
                    
#                 try:
#                     success = arcpy.management.CreateRole(workspace, role_name, user_name=full_user_to_add_name)
#                 except Exception as createRoleEx:
#                     logging.info("35 could not create role - because: " + str(createRoleEx));
#                     try:
#                         success = arcpy.management.CreateRole(workspace, role_name, user_name=full_user_to_add_name)
#                     except Exception as createRoleEx2:
#                         logging.info("37 could not create role again - because: " + str(createRoleEx2));
#                         success = False
                    
#     except Exception as ex:
#         template = "An exception of type {0} occurred. Arguments:\n{1!r}"
#         return_message = template.format(type(ex).__name__, ex.args)
#         logging.info("Got into the exception and got the error: " + str(return_message));
#         success = False
#     finally:
#         delete_connection_file(database, admin_user)
#         return {
#             "message": return_message,
#             "success": success
#         }

@app.post("/featureclasses")
def getFeatureClasses ():
    data = request.json
    featureClasses = []

    expected_fields = {
        "gdbPath": "GDB-sökväg saknas",
    }

    for expected_field in expected_fields:
        if not data.get(expected_field):
            return jsonify(success = False, message = expected_fields[expected_field], featureClasses = featureClasses)
    
    success = False
    return_message = ""

    try:
        gdb_path = data.get("gdbPath")

        workspace = gdb_path 
        arcpy.env.workspace = workspace

        featureClasses = arcpy.ListFeatureClasses()
        success = True
    except Exception as ex:
        template = "An exception of type {0} occurred. Arguments:\n{1!r}"
        return_message = template.format(type(ex).__name__, ex.args)
        success = False
    finally:
        return jsonify(success = success, message = return_message, featureClasses = featureClasses)

if __name__ == "__main__":
    serve(app, host="127.0.0.1", port=8045, threads=512)