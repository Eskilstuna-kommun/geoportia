import arcpy

def create_test_gdb(gdb_path):
    arcpy.CreateFileGDB_management(".", gdb_path)

    # Creating feature class
    arcpy.CreateFeatureclass_management(gdb_path, "LandParcels", "POLYGON", spatial_reference="WGS 1984")

    # Adding fields
    arcpy.AddField_management(gdb_path + "/LandParcels", "ParcelID", "TEXT")
    arcpy.AddField_management(gdb_path + "/LandParcels", "OwnerName", "TEXT")
    arcpy.AddField_management(gdb_path + "/LandParcels", "LandUseType", "SHORT")
    arcpy.AddField_management(gdb_path + "/LandParcels", "AreaSize", "DOUBLE")

    # Creating domain
    arcpy.CreateDomain_management(gdb_path, "LandUseDomain", "Land Use Type", "SHORT", "CODED")
    
    # Adding coded values to domain
    arcpy.AddCodedValueToDomain_management(gdb_path, "LandUseDomain", 1, "Residential")
    arcpy.AddCodedValueToDomain_management(gdb_path, "LandUseDomain", 2, "Commercial")
    arcpy.AddCodedValueToDomain_management(gdb_path, "LandUseDomain", 3, "Industrial")
    arcpy.AddCodedValueToDomain_management(gdb_path, "LandUseDomain", 4, "Agricultural")

if __name__ == "__main__":
    create_test_gdb("./plugins/catalog-backend-module-arcgis-sde-data/src/arcpy/test/TestGDB.gdb")