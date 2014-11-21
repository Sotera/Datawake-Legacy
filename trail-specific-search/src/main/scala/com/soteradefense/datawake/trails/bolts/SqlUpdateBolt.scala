package com.soteradefense.datawake.trails.bolts

import java.sql._
import java.util

import backtype.storm.task.TopologyContext
import backtype.storm.topology.OutputFieldsDeclarer
import backtype.storm.topology.base.BaseBasicBolt
import com.soteradefense.datawake.trails.sql.SqlCredentials

abstract class SqlUpdateBolt(sqlCredentials: SqlCredentials) extends BaseBasicBolt {
  var connection: Connection = null

  override def prepare(stormConf: util.Map[_, _], context: TopologyContext): Unit = {
    super.prepare(stormConf, context)
    Class.forName("com.mysql.jdbc.Driver")
    connection = DriverManager.getConnection(sqlCredentials.jdbc, sqlCredentials.username, sqlCredentials.password)
  }


  override def declareOutputFields(declarer: OutputFieldsDeclarer): Unit = {
    //Do nothing
  }

  override def cleanup(): Unit = {
    if (connection != null)
      connection.close()
    super.cleanup()
  }
}
