package com.soteradefense.datawake.trails.entitycount

import backtype.storm.topology.TopologyBuilder
import backtype.storm.tuple.Fields
import backtype.storm.{Config, LocalCluster}
import com.soteradefense.datawake.trails.entitycount.bolts.{SearchTermSumBolt, SqlUpdateBolt}
import com.soteradefense.datawake.trails.entitycount.data.LinkTrailData
import com.soteradefense.datawake.trails.entitycount.decoder.LinkTrailDataDecoder
import com.soteradefense.datawake.trails.spouts.HighLevelKafkaConsumer

object EntityCountTopology {
  def main(args: Array[String]): Unit = {
    val topologyBuilder: TopologyBuilder = new TopologyBuilder()
    val zkNodes: String = "192.168.59.103:2181"

    val kafkaConsumer = new HighLevelKafkaConsumer[LinkTrailData](
      new Fields("kafkaOrg", "kafkaDomain", "kafkaTrail", "kafkaTerm", "kafkaLink", "kafkaHtml", "kafkaTitle"),
      new LinkTrailDataDecoder,
      zkNodes,
      "crawler-out", "trail-hit")

    val insertSql: String = """INSERT INTO trail_term_rank(org, domain, trail, url, title, rank) VALUES(?,?,?,?,?,?)"""
    val updateSql: String = """UPDATE trail_term_rank SET rank = ? WHERE org = ? AND domain = ? AND trail = ? AND url = ? AND title = ?"""
    val selectCountSql: String = """SELECT rank FROM trail_term_rank WHERE org = ? AND domain = ? AND trail = ? AND url = ? AND title = ?"""
    val jdbc: String = "jdbc:mysql://192.168.59.103:3336/memex_sotera"
    val username: String = "root"
    val password: String = "root"


    topologyBuilder.setSpout("html-contents-spout",
      kafkaConsumer)

    topologyBuilder.setBolt("search-term",
      new SearchTermSumBolt(new Fields("org", "datawake/domain", "trail", "link", "title", "sum")))
      .shuffleGrouping("html-contents-spout")

    topologyBuilder.setBolt("db-write",
      new SqlUpdateBolt(jdbc, username, password, insertSql, selectCountSql, updateSql))
      .shuffleGrouping("search-term")

    val localCluster = new LocalCluster()
    val config = new Config
    localCluster.submitTopology("search-crawler", config, topologyBuilder.createTopology())
  }

}
