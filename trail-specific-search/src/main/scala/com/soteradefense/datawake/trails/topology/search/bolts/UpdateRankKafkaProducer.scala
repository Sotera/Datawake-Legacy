package com.soteradefense.datawake.trails.topology.search.bolts

import java.sql.{Connection, DriverManager, PreparedStatement}
import java.util

import backtype.storm.task.TopologyContext
import backtype.storm.topology.{BasicOutputCollector, OutputFieldsDeclarer}
import backtype.storm.tuple.Tuple
import com.soteradefense.datawake.trails.bolts.HighLevelKafkaProducer
import com.soteradefense.datawake.trails.sql.SqlCredentials
import kafka.producer.KeyedMessage

class UpdateRankKafkaProducer(sqlCredentials: SqlCredentials, selectSql: String, topic: String, brokers: String) extends HighLevelKafkaProducer(brokers, topic) {

  var connection: Connection = null

  override def prepare(stormConf: util.Map[_, _], context: TopologyContext): Unit = {
    super.prepare(stormConf, context)
    Class.forName("com.mysql.jdbc.Driver")
    connection = DriverManager.getConnection(sqlCredentials.jdbc, sqlCredentials.username, sqlCredentials.password)
  }

  override def execute(input: Tuple, collector: BasicOutputCollector): Unit = {
    val org = input.getStringByField("updateOrg")
    val domain = input.getStringByField("updateDomain")
    val trail = input.getStringByField("updateTrail")
    var selectAllUrls: PreparedStatement = null
    try {
      selectAllUrls = connection.prepareStatement(selectSql)
      selectAllUrls.setString(1, org)
      selectAllUrls.setString(2, domain)
      selectAllUrls.setString(3, trail)
      val urlSet = selectAllUrls.executeQuery()
      val builder = new StringBuilder
      while (urlSet.next()) {
        val url = urlSet.getString("url")
        builder.append(org)
        builder.append("\0")
        builder.append(domain)
        builder.append("\0")
        builder.append(trail)
        builder.append("\0")
        builder.append(url)
        val message = new KeyedMessage[String, String](topic, builder.toString())
        try {
          kafkaProducer.send(message)
        } catch {
            case FailedToSendMessageException => logger.error("Error publishing " + message + " to topic: " + topic)
        }
        builder.setLength(0)
      }

    } finally {
      if (selectAllUrls != null)
        selectAllUrls.close()
    }
  }


  override def cleanup(): Unit = super.cleanup()


  override def declareOutputFields(declarer: OutputFieldsDeclarer): Unit = {

  }

}
