package com.soteradefense.datawake.trails.topology.rank.bolt

import java.sql.PreparedStatement

import backtype.storm.topology.{BasicOutputCollector, OutputFieldsDeclarer}
import backtype.storm.tuple.{Fields, Tuple, Values}
import com.soteradefense.datawake.trails.bolts.SqlUpdateBolt
import com.soteradefense.datawake.trails.regex.RegexWords
import com.soteradefense.datawake.trails.sql.SqlCredentials

import scala.collection.mutable

class ComputeUrlRankBolt(sqlCredentials: SqlCredentials, validTermsSql: String, htmlSql: String, invalidTermsSql: String, outputFields: Fields, searchFields: Fields) extends SqlUpdateBolt(sqlCredentials) {

  val resultOrdering = new Ordering[(String, Double)]() {
    override def compare(x: (String, Double), y: (String, Double)): Int = x._2.compare(y._2)
  }

  override def execute(input: Tuple, collector: BasicOutputCollector): Unit = {
    val org = input.getStringByField("kafkaOrg")
    val domain = input.getStringByField("kafkaDomain")
    val trail = input.getStringByField("kafkaTrail")
    val url = input.getStringByField("kafkaLink")
    var htmlPrepare: PreparedStatement = null
    try {
      val validTerms = getTerms(validTermsSql, org, domain, trail)
      val irrelevantTerms = getTerms(invalidTermsSql, org, domain, trail)
      htmlPrepare = connection.prepareStatement(htmlSql)
      htmlPrepare.setString(1, url)
      val htmlSet = htmlPrepare.executeQuery()
      if (htmlSet.next()) {
        val html = htmlSet.getString("html")
        val termCount = RegexWords.getRank(validTerms, irrelevantTerms, html)
        collector.emit("count", new Values(org, domain, trail, url, termCount.asInstanceOf[java.lang.Double]))
      }
      if (validTerms.length >= 2) {
        val domainTriplet = org + "\0" + domain + "\0" + trail
        emitConcatenatedTermSearch(collector, validTerms, domainTriplet)
      }
    } finally {
      if (htmlPrepare != null)
        htmlPrepare.close()
    }
  }

  def emitConcatenatedTermSearch(collector: BasicOutputCollector, searchTerms: mutable.PriorityQueue[(String, Double)], domainTriplet: String) = {
    val searchSeparator = " + "
    val newTermBuilder: StringBuilder = new StringBuilder()
    newTermBuilder.append(searchTerms.dequeue()._1)
    newTermBuilder.append(searchSeparator)
    newTermBuilder.append(searchTerms.dequeue()._1)
    collector.emit("search", new Values(domainTriplet, newTermBuilder.toString()))
    while (searchTerms.nonEmpty) {
      newTermBuilder.append(searchTerms.dequeue()._1)
      newTermBuilder.append(searchSeparator)
    }
    newTermBuilder.setLength(newTermBuilder.length - searchSeparator.length)
    collector.emit("search", new Values(domainTriplet, newTermBuilder.toString()))
  }

  def getTerms(sql: String, org: String, domain: String, trail: String): mutable.PriorityQueue[(String, Double)] = {
    var termsPrepare: PreparedStatement = null
    try {
      termsPrepare = connection.prepareStatement(sql)
      termsPrepare.setString(1, org)
      termsPrepare.setString(2, domain)
      termsPrepare.setString(3, trail)
      val resultSet = termsPrepare.executeQuery()
      val validTermList = new mutable.PriorityQueue[(String, Double)]()(resultOrdering)
      while (resultSet.next()) {
        validTermList += Tuple2(resultSet.getString("entity"), 1.0 / RegexWords.log2(resultSet.getString("google_result_count").toDouble))
      }
      validTermList
    } finally {
      if (termsPrepare != null)
        termsPrepare.close()
    }
  }

  override def declareOutputFields(declarer: OutputFieldsDeclarer): Unit = {
    declarer.declareStream("count", outputFields)
    declarer.declareStream("search", searchFields)
  }
}
