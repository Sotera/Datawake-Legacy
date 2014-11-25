package com.soteradefense.datawake.trails.topology.rank.bolt

import java.sql.PreparedStatement

import backtype.storm.topology.{BasicOutputCollector, OutputFieldsDeclarer}
import backtype.storm.tuple.{Fields, Tuple, Values}
import com.soteradefense.datawake.trails.bolts.SqlUpdateBolt
import com.soteradefense.datawake.trails.regex.RegexWords
import com.soteradefense.datawake.trails.sql.SqlCredentials

import scala.collection.mutable.ListBuffer

class ComputeUrlRankBolt(sqlCredentials: SqlCredentials, validTermsSql: String, htmlSql: String,invalidTermsSql: String, outputFields: Fields) extends SqlUpdateBolt(sqlCredentials) {

  override def execute(input: Tuple, collector: BasicOutputCollector): Unit = {
    val org = input.getStringByField("kafkaOrg")
    val domain = input.getStringByField("kafkaDomain")
    val trail = input.getStringByField("kafkaTrail")
    val url = input.getStringByField("kafkaLink")
    var htmlPrepare: PreparedStatement = null
    try {
      val validTermList = getValidTerms(validTermsSql, org, domain, trail)
      val invalidTermList = getValidTerms(invalidTermsSql, org, domain, trail)
      htmlPrepare = connection.prepareStatement(htmlSql)
      htmlPrepare.setString(1, url)
      val htmlSet = htmlPrepare.executeQuery()
      if (htmlSet.next()) {
        val html = htmlSet.getString("html")
        val termCount = RegexWords.getRank(validTermList,invalidTermList, html)
        collector.emit(new Values(org, domain, trail, url, termCount.asInstanceOf[java.lang.Double]))
      }

    } finally {

      if (htmlPrepare != null)
        htmlPrepare.close()
    }
  }

  def getValidTerms(sql: String, org: String, domain: String, trail: String) = {
    var termsPrepare: PreparedStatement = null
    try {
      termsPrepare = connection.prepareStatement(sql)
      termsPrepare.setString(1, org)
      termsPrepare.setString(2, domain)
      termsPrepare.setString(3, trail)
      val resultSet = termsPrepare.executeQuery()
      val validTermList = new ListBuffer[(String, Double)]
      while (resultSet.next()) {
        validTermList += Tuple2(resultSet.getString("entity"), resultSet.getString("google_result_count").toDouble)
      }
      validTermList
    } finally {
      if (termsPrepare != null)
        termsPrepare.close()
    }
  }

  override def declareOutputFields(declarer: OutputFieldsDeclarer): Unit = {
    declarer.declare(outputFields)
  }
}
