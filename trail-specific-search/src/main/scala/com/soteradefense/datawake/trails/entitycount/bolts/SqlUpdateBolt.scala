package com.soteradefense.datawake.trails.entitycount.bolts

import java.sql._
import java.util

import backtype.storm.task.TopologyContext
import backtype.storm.topology.base.BaseBasicBolt
import backtype.storm.topology.{BasicOutputCollector, OutputFieldsDeclarer}
import backtype.storm.tuple.Tuple

class SqlUpdateBolt(sqlConnection: String, username: String, password: String, insertSql: String, selectCountSql: String, updateSql: String) extends BaseBasicBolt {
  var connection: Connection = null

  override def prepare(stormConf: util.Map[_, _], context: TopologyContext): Unit = {
    super.prepare(stormConf, context)
    Class.forName("com.mysql.jdbc.Driver")
    connection = DriverManager.getConnection(sqlConnection, username, password)
  }

  override def execute(input: Tuple, collector: BasicOutputCollector): Unit = {
    val org = input.getStringByField("org")
    val domain = input.getStringByField("domain")
    val trail = input.getStringByField("trail")
    val link = input.getStringByField("link")
    val title = input.getStringByField("title")
    var sum = input.getIntegerByField("sum")
    //Get Existing Count
    var selectPrepare: PreparedStatement = null
    var sqlPrepare: PreparedStatement = null
    try {
      selectPrepare = connection.prepareStatement(selectCountSql)
      selectPrepare.setString(1, org)
      selectPrepare.setString(2, domain)
      selectPrepare.setString(3, trail)
      selectPrepare.setString(4, link)
      selectPrepare.setString(5, title)
      val rs = selectPrepare.executeQuery()
      var count = 0
      if (rs.next()) {
        count = rs.getInt("rank")
        count += sum
        sqlPrepare = connection.prepareStatement(updateSql)
        sqlPrepare.setInt(1, count)
        sqlPrepare.setString(2, org)
        sqlPrepare.setString(3, domain)
        sqlPrepare.setString(4, trail)
        sqlPrepare.setString(5, link)
        sqlPrepare.setString(6, title)
        sqlPrepare.execute()

      } else {
        count += sum
        //Insert
        sqlPrepare = connection.prepareStatement(insertSql)
        sqlPrepare.setString(1, org)
        sqlPrepare.setString(2, domain)
        sqlPrepare.setString(3, trail)
        sqlPrepare.setString(4, link)
        sqlPrepare.setString(5, title)
        sqlPrepare.setInt(6, count)
        sqlPrepare.executeUpdate()

      }
    } catch {
      case e: SQLException =>
        println(e.getMessage)
    } finally {
      if(sqlPrepare != null)
        sqlPrepare.close()
      if(selectPrepare != null)
        selectPrepare.close()
    }

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
