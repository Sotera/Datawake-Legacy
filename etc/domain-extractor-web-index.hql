CREATE TABLE domain_extractor_web_index(
    rowkey STRING,
    dt STRING
)
STORED BY 'org.apache.hadoop.hive.hbase.HBaseStorageHandler'
WITH SERDEPROPERTIES ('hbase.columns.mapping' = ':key,colFam:c')
TBLPROPERTIES ('hbase.table.name' = 'datawake_domain_extractor_web_index_hbase');