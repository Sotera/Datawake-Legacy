package com.soteradefense.datawake.trails.topology.rank.bolt

import java.sql.SQLException

import backtype.storm.topology.BasicOutputCollector
import backtype.storm.tuple.Tuple
import com.soteradefense.datawake.trails.bolts.SqlUpdateBolt
import com.soteradefense.datawake.trails.sql.{SQLExecutor, SqlCredentials}

class UpdateUrlRankBolt(sqlCredentials: SqlCredentials, updateSql: String) extends SqlUpdateBolt(sqlCredentials) {

  override def execute(input: Tuple, collector: BasicOutputCollector): Unit = {
    val org = input.getStringByField("org")
    val domain = input.getStringByField("domain")
    val trail = input.getStringByField("trail")
    val link = input.getStringByField("url")
    val count = input.getIntegerByField("count")
    //Get Existing Count
    val sqlHelper = new SQLExecutor(this.connection)

    try {
      sqlHelper.updateCount(updateSql, count, org, domain, trail, link)
    } catch {
      case e: SQLException =>
        println(e.getMessage)
    }

  }
}
