package com.soteradefense.datawake.trails.topology.search.bolts

import java.io.InputStreamReader
import java.net.{URL, URLEncoder}
import java.sql.{Connection, DriverManager, PreparedStatement}
import java.util

import backtype.storm.task.TopologyContext
import backtype.storm.topology.base.BaseBasicBolt
import backtype.storm.topology.{BasicOutputCollector, OutputFieldsDeclarer}
import backtype.storm.tuple.{Fields, Tuple, Values}
import com.soteradefense.datawake.trails.constants.DatawakeConstants
import com.soteradefense.datawake.trails.sql.SqlCredentials
import com.soteradefense.datawake.trails.topology.search.json.SearchResults
import net.ettinsmoor.Bingerator
import net.liftweb.json._

class SearchBolt(sqlCredentials: SqlCredentials, newUrl: Fields, newTerm: Fields, selectSql: String, resultUpdateSql: String, invalidResultUpdateSql: String) extends BaseBasicBolt {

  val GOOGLE_API: String = "http://ajax.googleapis.com/ajax/services/search/web?v=1.0&q="
  val DEFAULT_CHARSET: String = "UTF-8"
  val RESULT_SET: String = "&rsz=8"
  var connection: Connection = null
  var bingKey: String = null

  override def prepare(stormConf: util.Map[_, _], context: TopologyContext): Unit = {
    super.prepare(stormConf, context)
    Class.forName("com.mysql.jdbc.Driver")
    connection = DriverManager.getConnection(sqlCredentials.jdbc, sqlCredentials.username, sqlCredentials.password)
    bingKey = stormConf.get(DatawakeConstants.BING_KEY_ID).asInstanceOf[String]
  }

  override def execute(input: Tuple, collector: BasicOutputCollector): Unit = {
    val searchTerm: String = input.getStringByField("kafkaTerm")
    val org: String = input.getStringByField("kafkaOrg")
    val domain: String = input.getStringByField("kafkaDomain")
    val trail: String = input.getStringByField("kafkaTrail")
    val valid: Boolean = input.getBooleanByField("kafkaValid")
    try {
      val estimatedResultCount = getEstimatedResultCount(searchTerm)
      if (valid) {
        updateResultCount(resultUpdateSql, org, domain, trail, searchTerm, estimatedResultCount)
        val bingResults = new Bingerator(bingKey).SearchWeb(searchTerm).take(10)
        bingResults.foreach(f => {
          if (!isInDatabase(org, domain, trail, f.url)) {
            collector.emit("new-url", new Values(org, domain, trail, f.url, f.title))
          }
        })
      } else {
        updateResultCount(invalidResultUpdateSql, org, domain, trail, searchTerm, estimatedResultCount)
      }
    } catch {
      case _: Throwable =>
        println("No Results Found")
    }
    //EMIT TO UrlFilterBolt
    collector.emit("new-term", new Values(org, domain, trail))
  }

  def getEstimatedResultCount(term: String): String = {
    try {
      val url: URL = new URL(GOOGLE_API + URLEncoder.encode(term, DEFAULT_CHARSET) + RESULT_SET)
      val reader = new InputStreamReader(url.openStream(), DEFAULT_CHARSET)
      implicit val formats = DefaultFormats
      val jValue = JsonParser.parse(reader)
      val results: SearchResults = jValue.extract[SearchResults]
      results.responseData.cursor.estimatedResultCount
    } catch{
      case e: Throwable =>
        println("Exception")
        "1000000000"
    }
  }

  def updateResultCount(sql: String, org: String, domain: String, trail: String, term: String, estimatedResultCount: String) = {
    var countPrepare: PreparedStatement = null
    try {
      countPrepare = connection.prepareStatement(sql)
      countPrepare.setString(1, estimatedResultCount)
      countPrepare.setString(2, org)
      countPrepare.setString(3, domain)
      countPrepare.setString(4, trail)
      countPrepare.setString(5, term)
      countPrepare.executeUpdate()

    } finally {
      if (countPrepare != null)
        countPrepare.close()
    }
  }

  def isInDatabase(org: String, domain: String, trail: String, url: String): Boolean = {
    var countPrepare: PreparedStatement = null
    try {
      countPrepare = connection.prepareStatement(selectSql)
      countPrepare.setString(1, org)
      countPrepare.setString(2, domain)
      countPrepare.setString(3, trail)
      countPrepare.setString(4, url)
      val resultSet = countPrepare.executeQuery()
      if (resultSet.next())
        resultSet.getInt("doesExist") != 0
      false
    } finally {
      if (countPrepare != null)
        countPrepare.close()
    }
  }

  override def declareOutputFields(declarer: OutputFieldsDeclarer): Unit = {
    declarer.declareStream("new-url", newUrl)
    declarer.declareStream("new-term", newTerm)
  }

  override def cleanup(): Unit = {
    super.cleanup()
    if (connection != null)
      connection.close()
  }
}
