package com.soteradefense.datawake.trails.count.bolts

import java.sql.SQLException

import backtype.storm.topology.BasicOutputCollector
import backtype.storm.tuple.Tuple
import com.soteradefense.datawake.trails.bolts.SqlUpdateBolt
import com.soteradefense.datawake.trails.sql.{SqlCredentials, SQLExecutor}

class IrrelevantTermSqlBolt(sqlCredentials: SqlCredentials, insertSql: String) extends SqlUpdateBolt(sqlCredentials) {
  override def execute(input: Tuple, collector: BasicOutputCollector): Unit = {
    val org = input.getStringByField("org")
    val domain = input.getStringByField("domain")
    val trail = input.getStringByField("trail")
    val link = input.getStringByField("link")
    val title = input.getStringByField("title")
    //Get Existing Count
    val sqlHelper = new SQLExecutor(this.connection)
    val count = 0.0
    try {
      sqlHelper.updateCount(insertSql, count, org, domain, trail, link)
    } catch {
      case e: SQLException =>
        println(e.getMessage)
    }
  }
}
