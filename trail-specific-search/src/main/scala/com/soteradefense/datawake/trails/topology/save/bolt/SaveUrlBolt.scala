package com.soteradefense.datawake.trails.topology.save.bolt

import backtype.storm.topology.{OutputFieldsDeclarer, BasicOutputCollector}
import backtype.storm.tuple.{Fields, Values, Tuple}
import com.soteradefense.datawake.trails.bolts.SqlUpdateBolt
import com.soteradefense.datawake.trails.sql.{SQLExecutor, SqlCredentials}

class SaveUrlBolt(sqlCredentials: SqlCredentials, insertUrlEntitySql: String, outputFields: Fields) extends SqlUpdateBolt(sqlCredentials) {
  override def execute(input: Tuple, collector: BasicOutputCollector): Unit = {
    val url = input.getStringByField("sqlUrl")
    val org = input.getStringByField("sqlOrg")
    val domain = input.getStringByField("sqlDomain")
    val trail = input.getStringByField("sqlTrail")
    val title = input.getStringByField("sqlTitle")
    val sqlWrapper = new SQLExecutor(connection)
    val rowsChanged = sqlWrapper.insertCount(insertUrlEntitySql, 0.0, org, domain, trail, url, title)
    logger.info("Emitting to Rank Count: %s", rowsChanged)
    collector.emit(new Values(org, domain, trail, url))

  }

  override def declareOutputFields(declarer: OutputFieldsDeclarer): Unit = {
    super.declareOutputFields(declarer)
    declarer.declare(outputFields)
  }
}
