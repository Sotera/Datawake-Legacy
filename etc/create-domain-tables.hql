CREATE TABLE datawake_domain_entities(
    rowkey STRING,
    c STRING
)
STORED BY 'org.apache.hadoop.hive.hbase.HBaseStorageHandler'
WITH SERDEPROPERTIES ('hbase.columns.mapping' = ':key,colFam:c')
TBLPROPERTIES ('hbase.table.name' = 'datawake_domain_entities_hbase');
