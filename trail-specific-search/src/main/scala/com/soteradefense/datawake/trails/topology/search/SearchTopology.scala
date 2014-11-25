package com.soteradefense.datawake.trails.topology.search

import backtype.storm.topology.TopologyBuilder
import backtype.storm.tuple.Fields
import backtype.storm.{Config, LocalCluster}
import com.soteradefense.datawake.trails.constants.DatawakeConstants
import com.soteradefense.datawake.trails.spouts.HighLevelKafkaConsumer
import com.soteradefense.datawake.trails.sql.SqlCredentials
import com.soteradefense.datawake.trails.topology.search.bolts._
import com.soteradefense.datawake.trails.topology.search.data.DatawakeTerm
import com.soteradefense.datawake.trails.topology.search.decoder.DatawakeTermDecoder

object SearchTopology {

  def main(args: Array[String]): Unit = {
    val topologyBuilder: TopologyBuilder = new TopologyBuilder()

    val sqlCredentials = new SqlCredentials(DatawakeConstants.JDBC, DatawakeConstants.SQL_USERNAME, DatawakeConstants.SQL_PASSWORD)


    val kafkaConsumer = new HighLevelKafkaConsumer[DatawakeTerm](
      new Fields("kafkaOrg", "kafkaDomain", "kafkaTrail", "kafkaTerm", "kafkaValid"),
      new DatawakeTermDecoder,
      DatawakeConstants.ZK_NODES,
      DatawakeConstants.TRAIL_SEARCH_TOPIC, "trail-search-consumer")

    val selectAllUrlsSql = "SELECT url from trail_term_rank WHERE org = ? AND domain = ? AND trail = ?"
    val selectUrlExistsCountSql = "SELECT EXISTS (SELECT 1 from trail_term_rank WHERE org = ? AND domain = ? AND trail = ? AND url = ?) as doesExist"
    topologyBuilder.setSpout("search-term-spout", kafkaConsumer)
    val updateResultCountSql = """UPDATE trail_based_entities SET google_result_count = ? WHERE org = ? AND domain = ? AND trail = ? AND entity = ?"""
    val invalidUpdateResultSql = """UPDATE irrelevant_trail_based_entities SET google_result_count = ? WHERE org = ? AND domain = ? AND trail = ? AND entity = ?"""
    val googleSearchBolt = new SearchBolt(
      sqlCredentials,
      new Fields("org", "domain", "trail", "url", "title"),
      new Fields("updateOrg", "updateDomain", "updateTrail"),
      selectUrlExistsCountSql, updateResultCountSql,invalidUpdateResultSql)

    //QUERIES GOOGLE FOR SEARCH RESULTS
    topologyBuilder.setBolt("google-search", googleSearchBolt)
      .shuffleGrouping("search-term-spout")

    //POSTS TO THE KAFKA QUEUE THAT UPDATES THE COUNT FOR A URL
    topologyBuilder.setBolt("url-filter", new UpdateRankKafkaProducer(sqlCredentials, selectAllUrlsSql, DatawakeConstants.KAFKA_BROKERS, "update-url"))
      .shuffleGrouping("google-search", "new-term")

    //POSTS TO THE KAFKA QUEUE THAT SCRAPES THE HTML
    topologyBuilder.setBolt("scrape-kafka", new CrawlerKafkaProducer(DatawakeConstants.KAFKA_BROKERS, "crawler-in"))
      .shuffleGrouping("google-search", "new-url")

    val localCluster = new LocalCluster()
    val config = new Config
    localCluster.submitTopology("search-crawler", config, topologyBuilder.createTopology())
  }

}