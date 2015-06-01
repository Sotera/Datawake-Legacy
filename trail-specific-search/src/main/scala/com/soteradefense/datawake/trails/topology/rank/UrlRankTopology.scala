package com.soteradefense.datawake.trails.topology.rank

import backtype.storm.topology.TopologyBuilder
import backtype.storm.tuple.Fields
import backtype.storm.{Config, LocalCluster}
import com.soteradefense.datawake.trails.constants.DatawakeConstants
import com.soteradefense.datawake.trails.exception.DatawakeException
import com.soteradefense.datawake.trails.spouts.HighLevelKafkaConsumer
import com.soteradefense.datawake.trails.sql.SqlCredentials
import com.soteradefense.datawake.trails.topology.rank.bolt.{AddUrlEntity, ComputeUrlRankBolt, SearchKafkaProducer, UpdateUrlRankBolt}
import com.soteradefense.datawake.trails.topology.rank.data.DatawakeLink
import com.soteradefense.datawake.trails.topology.rank.decoder.DatawakeLinkDecoder

object UrlRankTopology {

  def main(args: Array[String]) = {
    val topologyBuilder: TopologyBuilder = new TopologyBuilder()

    val kafkaConsumer = new HighLevelKafkaConsumer[DatawakeLink](
      new Fields("kafkaOrg", "kafkaDomain", "kafkaTrail", "kafkaLink"),
      new DatawakeLinkDecoder,
      "datawake-update-url", "count-entities-listener")

    val updateSql: String = """UPDATE trail_term_rank SET rank = ? WHERE org = ? AND domain = ? AND trail = ? AND url = ?"""
    val jdbc = sys.env.getOrElse("DW_DB_JDBC", throw new DatawakeException("You need to set your JDBC String for interacting with a database."))
    val sqlUser = sys.env.getOrElse("DW_DB_USER", throw new DatawakeException("You need to set your database username."))
    val sqlPassword = sys.env.getOrElse("DW_DB_PASSWORD", throw new DatawakeException("You need to set your database password."))
    val sqlCredentials = new SqlCredentials(jdbc, sqlUser, sqlPassword)

    topologyBuilder.setSpout("update-link-spout",
      kafkaConsumer)
    val selectRelevantTermsSql: String = """SELECT entity, google_result_count from trail_based_entities WHERE org = ? AND domain = ? AND trail = ?"""
    val selectIrrelevantTermsSql: String = """SELECT entity, google_result_count from irrelevant_trail_based_entities WHERE org = ? AND domain = ? AND trail = ?"""
    val selectHtmlSql: String = """SELECT html from trail_entities_contents WHERE url = ?"""

    val selectPageRank = "SELECT pageRank from trail_term_rank WHERE org = ? AND domain = ? AND trail = ? AND url = ? ORDER BY pageRank ASC LIMIT 1"

    topologyBuilder.setBolt("count-entities",
      new ComputeUrlRankBolt(sqlCredentials, selectRelevantTermsSql, selectHtmlSql, selectIrrelevantTermsSql,
        selectPageRank,
        new Fields("org", "domain", "trail", "url", "count"),
        new Fields("domainTriplet", "term"), new Fields("eOrg", "eDomain", "eTrail", "eUrl", "eEntity", "eRelevant")))
      .shuffleGrouping("update-link-spout")

    topologyBuilder.setBolt("update-count-in-db", new UpdateUrlRankBolt(sqlCredentials, updateSql))
      .shuffleGrouping("count-entities", "count")
    val kafkaBrokers = sys.env.get("DW_KAFKA_BROKERS")

    topologyBuilder.setBolt("search-concatenated-terms", new SearchKafkaProducer(DatawakeConstants.TRAIL_SEARCH_TOPIC, kafkaBrokers.getOrElse(throw new DatawakeException("Your Kafka Brokers are not set!"))))
      .fieldsGrouping("count-entities", "search", new Fields("domainTriplet"))
    val selectSql = """SELECT count(*) as "count" from entities_on_url WHERE org = ? AND domain = ? AND trail = ? AND entity = ? AND url = ? AND relevant = ?"""
    val insertSql = """INSERT INTO entities_on_url(org, domain, trail, entity, url, relevant) VALUES (?,?,?,?,?,?)"""
    topologyBuilder.setBolt("add-entity-for-url", new AddUrlEntity(sqlCredentials, selectSql, insertSql))
      .shuffleGrouping("count-entities", "add-entity")

    val localCluster = new LocalCluster()
    val config = new Config
    val zkQuorum = sys.env.get("DW_ZK_QUORUM")
    config.put(DatawakeConstants.ZK_NODES_ID, zkQuorum.getOrElse(throw new DatawakeException("Your Zookeeper nodes were not set!")))
    localCluster.submitTopology("search-crawler", config, topologyBuilder.createTopology())
  }

}
