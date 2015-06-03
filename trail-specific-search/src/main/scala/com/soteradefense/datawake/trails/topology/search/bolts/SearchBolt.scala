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
import com.soteradefense.datawake.trails.rank.DatawakeUrlRankHelper
import com.soteradefense.datawake.trails.sql.SqlCredentials
import com.soteradefense.datawake.trails.topology.search.data.{DatawakeInternetResult, DatawakeSearchResults}
import com.soteradefense.datawake.trails.topology.search.json.{GoogleResults, Result, SearchResults}
import net.ettinsmoor.{Bingerator, WebResult}
import net.liftweb.json._
import org.slf4j.{Logger, LoggerFactory}

import scala.collection.mutable
import scala.collection.mutable.ListBuffer

class SearchBolt(sqlCredentials: SqlCredentials, newUrl: Fields, newTerm: Fields, selectPageRank: String, resultUpdateSql: String, invalidResultUpdateSql: String, updatePageRankSql: String) extends BaseBasicBolt {

  var GOOGLE_CX: String = null
  var GOOGLE_KEY: String = null
  var GOOGLE_API: String = null
  val DEFAULT_CHARSET: String = "UTF-8"
  val RESULT_SET: String = "&rsz=8"
  var connection: Connection = null
  var bingKey: String = null
  var logger: Logger = null
  var SEARCH_API: String = null

  override def prepare(stormConf: util.Map[_, _], context: TopologyContext): Unit = {
    super.prepare(stormConf, context)
    Class.forName("com.mysql.jdbc.Driver")
    connection = DriverManager.getConnection(sqlCredentials.jdbc, sqlCredentials.username, sqlCredentials.password)
    bingKey = stormConf.get(DatawakeConstants.BING_KEY_ID).asInstanceOf[String]
    GOOGLE_KEY = stormConf.get(DatawakeConstants.GOOGLE_KEY_ID).asInstanceOf[String]
    GOOGLE_CX = stormConf.get(DatawakeConstants.GOOGLE_CX_ID).asInstanceOf[String]
    SEARCH_API = stormConf.get(DatawakeConstants.SEARCH_ENDPOINT_ID).asInstanceOf[String]
    logger = LoggerFactory.getLogger(this.getClass)

    GOOGLE_API = "https://www.googleapis.com/customsearch/v1?key=" + URLEncoder.encode(GOOGLE_KEY, DEFAULT_CHARSET) + "&cx=" + URLEncoder.encode(GOOGLE_CX, DEFAULT_CHARSET) + "&num=10&q="
  }

  override def execute(input: Tuple, collector: BasicOutputCollector): Unit = {
    val searchTerm: String = input.getStringByField("kafkaTerm")
    val org: String = input.getStringByField("kafkaOrg")
    val domain: String = input.getStringByField("kafkaDomain")
    val trail: String = input.getStringByField("kafkaTrail")
    val isRelevantTerm: Boolean = input.getBooleanByField("kafkaValid")
    val customSearch: GoogleResults = getGoogleResultsFromServer(searchTerm, 0)
    if (customSearch != null) {
      if (isRelevantTerm) {
        logger.info("Total Result Count For {}: {}", searchTerm, customSearch.results.size)
        var rank: Int = 0
        customSearch.results.foreach(f => {
          var pageRank = DatawakeUrlRankHelper.getPageRank(org, domain, trail, f.url, selectPageRank, connection)
          if (pageRank == -1) {
            collector.emit("new-url", new Values(org, domain, trail, f.url, f.title, rank.asInstanceOf[Integer]))
          } else {
            pageRank = Math.min(pageRank, rank)
            updatePageRank(org, domain, trail, f.url, pageRank)
          }

          rank = rank + 1
        })
        logger.info("Adding relevant entity: {} with {} pages ", searchTerm, customSearch.results.size)
        updateResultCount(resultUpdateSql, org, domain, trail, searchTerm, customSearch.resultCount)
      } else {
        updateResultCount(invalidResultUpdateSql, org, domain, trail, searchTerm, customSearch.resultCount)
      }
    }

    collector.emit("new-term", new Values(org, domain, trail))
  }

  def updatePageRank(org: String, domain: String, trail: String, url: String, rank: Int) = {
    var countPrepare: PreparedStatement = null
    try {
      countPrepare = connection.prepareStatement(updatePageRankSql)
      countPrepare.setInt(1, rank)
      countPrepare.setString(2, org)
      countPrepare.setString(3, domain)
      countPrepare.setString(4, trail)
      countPrepare.setString(5, url)
      countPrepare.executeUpdate()
    } finally {
      if (countPrepare != null)
        countPrepare.close()
    }
  }

  def getBingResults(term: String): ListBuffer[DatawakeInternetResult] = {
    try {
      new Bingerator(bingKey)
        .SearchWeb(term)
        .take(10)
        .foldLeft(new ListBuffer[DatawakeInternetResult])((l: ListBuffer[DatawakeInternetResult], item: WebResult) => {
        l += new DatawakeInternetResult(item.title, item.url)
        l
      })
    } catch {
      case _: Throwable =>
        logger.error("Could not fetch Bing Results: {}", term)
        new ListBuffer[DatawakeInternetResult]
    }
  }

  def getGoogleResults(term: String): DatawakeSearchResults = {
    try {
      val url: URL = new URL(GOOGLE_API + URLEncoder.encode(term, DEFAULT_CHARSET))
      val reader = new InputStreamReader(url.openStream(), DEFAULT_CHARSET)
      implicit val formats = DefaultFormats
      val jValue = JsonParser.parse(reader)
      val results: SearchResults = jValue.extract[SearchResults]
      val buffer = results.items.foldLeft(new mutable.HashSet[DatawakeInternetResult])((buf: mutable.HashSet[DatawakeInternetResult], item: Result) => {
        buf += new DatawakeInternetResult(item.title, item.link)
        buf
      })
      new DatawakeSearchResults(buffer, results.searchInformation.totalResults)
    } catch {
      case e: Throwable =>
        logger.info("Exception Returning Default: {}", e.getMessage)
        new DatawakeSearchResults(new mutable.HashSet[DatawakeInternetResult], "100")
    }
  }

  def getGoogleResultsFromServer(term: String, iterations: Int): GoogleResults = {
    try {
      val url: URL = new URL(SEARCH_API + URLEncoder.encode(term, DEFAULT_CHARSET))
      val reader = new InputStreamReader(url.openStream(), DEFAULT_CHARSET)
      implicit val formats = DefaultFormats
      val jValue = JsonParser.parse(reader)
      val response: GoogleResults = jValue.extract[GoogleResults]
      response
    } catch {
      case e: Throwable =>
        logger.info("Exception Returning Default: {}", e.getMessage)
        if (iterations < 3)
          getGoogleResultsFromServer(term, iterations + 1)
        else
          null
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
