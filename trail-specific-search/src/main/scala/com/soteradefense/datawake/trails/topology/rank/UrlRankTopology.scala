package com.soteradefense.datawake.trails.topology.rank

import backtype.storm.topology.TopologyBuilder
import backtype.storm.tuple.Fields
import backtype.storm.{Config, LocalCluster}
import com.soteradefense.datawake.trails.constants.DatawakeConstants
import com.soteradefense.datawake.trails.spouts.HighLevelKafkaConsumer
import com.soteradefense.datawake.trails.sql.SqlCredentials
import com.soteradefense.datawake.trails.topology.rank.bolt.{ComputeUrlRankBolt, UpdateUrlRankBolt}
import com.soteradefense.datawake.trails.topology.rank.data.DatawakeLink
import com.soteradefense.datawake.trails.topology.rank.decoder.DatawakeLinkDecoder

object UrlRankTopology {

  def main(args: Array[String]) = {
    val topologyBuilder: TopologyBuilder = new TopologyBuilder()

    val kafkaConsumer = new HighLevelKafkaConsumer[DatawakeLink](
      new Fields("kafkaOrg", "kafkaDomain", "kafkaTrail", "kafkaLink"),
      new DatawakeLinkDecoder,
      DatawakeConstants.ZK_NODES,
      "update-url", "count-entities-listener")

    val updateSql: String = """UPDATE trail_term_rank SET rank = ? WHERE org = ? AND domain = ? AND trail = ? AND url = ?"""

    val sqlCredentials = new SqlCredentials(DatawakeConstants.JDBC, DatawakeConstants.SQL_USERNAME, DatawakeConstants.SQL_PASSWORD)

    topologyBuilder.setSpout("update-link-spout",
      kafkaConsumer)
    val termsSql: String = """SELECT entity from trail_based_entities WHERE org = ? AND domain = ? AND trail = ?"""
    val htmlSql: String = """SELECT html from trail_entities_contents WHERE url = ?"""
    topologyBuilder.setBolt("count-entities", new ComputeUrlRankBolt(sqlCredentials, termsSql, htmlSql, new Fields("org", "domain", "trail", "url", "count")))
      .shuffleGrouping("update-link-spout")

    topologyBuilder.setBolt("update-count-in-db", new UpdateUrlRankBolt(sqlCredentials, updateSql))
      .shuffleGrouping("count-entities")


    val localCluster = new LocalCluster()
    val config = new Config
    localCluster.submitTopology("search-crawler", config, topologyBuilder.createTopology())
  }

}
