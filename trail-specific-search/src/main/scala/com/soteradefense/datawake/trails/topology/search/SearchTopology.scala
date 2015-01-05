package com.soteradefense.datawake.trails.topology.search

import backtype.storm.topology.TopologyBuilder
import backtype.storm.tuple.Fields
import backtype.storm.{Config, LocalCluster}
import com.soteradefense.datawake.trails.constants.DatawakeConstants
import com.soteradefense.datawake.trails.exception.DatawakeException
import com.soteradefense.datawake.trails.spouts.HighLevelKafkaConsumer
import com.soteradefense.datawake.trails.sql.SqlCredentials
import com.soteradefense.datawake.trails.topology.search.bolts._
import com.soteradefense.datawake.trails.topology.search.data.DatawakeTerm
import com.soteradefense.datawake.trails.topology.search.decoder.DatawakeTermDecoder

object SearchTopology {

  def main(args: Array[String]): Unit = {
    val topologyBuilder: TopologyBuilder = new TopologyBuilder()

    val jdbc = sys.env.getOrElse("DW_DB_JDBC", throw new DatawakeException("You need to set your JDBC String for interacting with a database."))
    val sqlUser = sys.env.getOrElse("DW_DB_USER", throw new DatawakeException("You need to set your database username."))
    val sqlPassword = sys.env.getOrElse("DW_DB_PASSWORD", throw new DatawakeException("You need to set your database password."))
    val sqlCredentials = new SqlCredentials(jdbc, sqlUser, sqlPassword)
    val useDistributedCrawler: Boolean = sys.env.getOrElse("DW_USE_DISTRIBUTED", "false").toBoolean


    val kafkaConsumer = new HighLevelKafkaConsumer[DatawakeTerm](
      new Fields("kafkaOrg", "kafkaDomain", "kafkaTrail", "kafkaTerm", "kafkaValid"),
      new DatawakeTermDecoder,
      DatawakeConstants.TRAIL_SEARCH_TOPIC, "trail-search-consumer")

    val selectTrailUrlsSql = "SELECT url from trail_term_rank WHERE org = ? AND domain = ? AND trail = ?"
    val selectPageRank = "SELECT pageRank FROM trail_term_rank WHERE org = ? AND domain = ? AND trail = ? AND url = ? ORDER BY pageRank ASC LIMIT 1"
    topologyBuilder.setSpout("search-term-spout", kafkaConsumer)
    val updateRelevantGoogleResultCountSql = """UPDATE trail_based_entities SET google_result_count = ? WHERE org = ? AND domain = ? AND trail = ? AND entity = ?"""
    val updateIrrelevantGoogleResultCountSql = """UPDATE irrelevant_trail_based_entities SET google_result_count = ? WHERE org = ? AND domain = ? AND trail = ? AND entity = ?"""
    val updatePageRankSql: String = """UPDATE trail_term_rank SET pageRank = ? WHERE org = ? AND domain = ? AND trail = ? AND url = ?"""
    val searchBolt = new SearchBolt(
      sqlCredentials,
      new Fields("org", "domain", "trail", "url", "title", "rank"),
      new Fields("updateOrg", "updateDomain", "updateTrail"),
      selectPageRank, updateRelevantGoogleResultCountSql, updateIrrelevantGoogleResultCountSql, updatePageRankSql)

    //QUERIES GOOGLE FOR SEARCH RESULTS
    topologyBuilder.setBolt("internet-search", searchBolt)
      .shuffleGrouping("search-term-spout")
    val kafkaBrokers = sys.env.get("DW_KAFKA_BROKERS")
    val kafkaCrawlerBrokers = if(useDistributedCrawler) sys.env.get("DW_KAFKA_CRAWLER_BROKERS") else kafkaBrokers
    //POSTS TO THE KAFKA QUEUE THAT UPDATES THE COUNT FOR A URL
    topologyBuilder.setBolt("url-filter", new UpdateRankKafkaProducer(sqlCredentials, selectTrailUrlsSql, "update-url", kafkaBrokers.getOrElse(throw new DatawakeException("Your Kafka Brokers are not set!"))))
      .shuffleGrouping("internet-search", "new-term")

    //POSTS TO THE KAFKA QUEUE THAT SCRAPES THE HTML
    val incoming_urls_topic = sys.env.get("DW_INCOMING_URLS")
    topologyBuilder.setBolt("scrape-kafka",
      new CrawlerKafkaProducer(incoming_urls_topic.getOrElse(throw new DatawakeException("Your incoming url topic was not set!")), kafkaCrawlerBrokers.getOrElse(throw new DatawakeException("Your Kafka " +
        "Brokers " +
        "are not set!"))))
      .shuffleGrouping("internet-search", "new-url")

    val localCluster = new LocalCluster()
    val config = new Config
    val bingKey = sys.env.get("DW_BING_KEY")
    val googleKey = sys.env.get("DW_GOOGLE_PUBLIC_KEY")
    val googleCx = sys.env.get("DW_GOOGLE_CUSTOM_SEARCH_CX")
    val zkQuorum = sys.env.get("DW_ZK_QUORUM")
    val searchApi = sys.env.get("DW_SEARCH_API")
    config.put(DatawakeConstants.BING_KEY_ID, bingKey.getOrElse(throw new DatawakeException("Your Bing Search Key was not set!")))
    config.put(DatawakeConstants.ZK_NODES_ID, zkQuorum.getOrElse(throw new DatawakeException("Your Zookeeper nodes were not set!")))
    config.put(DatawakeConstants.GOOGLE_KEY_ID, googleKey.getOrElse(throw new DatawakeException("Your Google Public API Key was not set!")))
    config.put(DatawakeConstants.GOOGLE_CX_ID, googleCx.getOrElse(throw new DatawakeException("Your Google Custom Search CX was not set!")))
    config.put(DatawakeConstants.SEARCH_ENDPOINT_ID, searchApi.getOrElse(throw new DatawakeException("Your Search API Endpoint was not set!")))
    localCluster.submitTopology("search-crawler", config, topologyBuilder.createTopology())
  }

}
