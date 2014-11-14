package com.soteradefense.datawake.trails.topology.save.bolt

import java.sql.PreparedStatement

import backtype.storm.topology.{BasicOutputCollector, OutputFieldsDeclarer}
import backtype.storm.tuple.{Fields, Tuple, Values}
import com.soteradefense.datawake.trails.bolts.SqlUpdateBolt
import com.soteradefense.datawake.trails.sql.SqlCredentials

class SaveRawHtmlBolt(sqlCredentials: SqlCredentials, htmlInsertSql: String, outputFields: Fields) extends SqlUpdateBolt(sqlCredentials) {
  override def execute(input: Tuple, collector: BasicOutputCollector): Unit = {
    var preparedStatement: PreparedStatement = null
    try {
      val url = input.getStringByField("kafkaLink")
      val html = input.getStringByField("kafkaHtml")
      val org = input.getStringByField("kafkaOrg")
      val domain = input.getStringByField("kafkaDomain")
      val trail = input.getStringByField("kafkaTrail")
      val title = input.getStringByField("kafkaTitle")
      val rank = input.getStringByField("kafkaRank")
      preparedStatement = connection.prepareStatement(htmlInsertSql)
      preparedStatement.setString(1, url)
      preparedStatement.setString(2, html)
      preparedStatement.executeUpdate()
      collector.emit(new Values(org, domain, trail, url, title, rank))
    } finally {
      if (preparedStatement != null)
        preparedStatement.close()
    }
  }

  override def declareOutputFields(declarer: OutputFieldsDeclarer): Unit = {
    declarer.declare(outputFields)
  }
}
