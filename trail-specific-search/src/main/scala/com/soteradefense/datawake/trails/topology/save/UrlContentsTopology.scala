package com.soteradefense.datawake.trails.topology.save

import backtype.storm.topology.TopologyBuilder
import backtype.storm.tuple.Fields
import backtype.storm.{Config, LocalCluster}
import com.soteradefense.datawake.trails.constants.DatawakeConstants
import com.soteradefense.datawake.trails.topology.save.bolt.{SaveRawHtmlBolt, UpdateUrlKafkaProducer}
import com.soteradefense.datawake.trails.topology.save.data.DatawakeCrawlerData
import com.soteradefense.datawake.trails.topology.save.decoder.DatawakeCrawlerDataDecoder
import com.soteradefense.datawake.trails.spouts.HighLevelKafkaConsumer
import com.soteradefense.datawake.trails.sql.SqlCredentials

object UrlContentsTopology {
  def main(args: Array[String]): Unit = {
    val topologyBuilder: TopologyBuilder = new TopologyBuilder()


    val kafkaConsumer = new HighLevelKafkaConsumer[DatawakeCrawlerData](
      new Fields("kafkaOrg", "kafkaDomain", "kafkaTrail", "kafkaLink", "kafkaHtml", "kafkaTitle"),
      new DatawakeCrawlerDataDecoder,
      DatawakeConstants.ZK_NODES,
      "crawler-out", "trail-save-html-contents-listener")



    val sqlCredentials = new SqlCredentials(DatawakeConstants.JDBC, DatawakeConstants.SQL_USERNAME, DatawakeConstants.SQL_PASSWORD)

    topologyBuilder.setSpout("html-contents-spout",
      kafkaConsumer)
    val rawHtmlInsert = """INSERT INTO trail_entities_contents(url, html) VALUES(?,?)"""
    val insertNewUrlAndRankSql: String = """INSERT INTO trail_term_rank(org, domain, trail, url, title, rank) VALUES(?,?,?,?,?,?)"""
    topologyBuilder.setBolt("save-html", new SaveRawHtmlBolt(sqlCredentials, rawHtmlInsert,insertNewUrlAndRankSql, new Fields("org", "domain", "trail", "url")))
      .shuffleGrouping("html-contents-spout")
    topologyBuilder.setBolt("count-link", new UpdateUrlKafkaProducer(DatawakeConstants.KAFKA_BROKERS, "update-url"))
      .shuffleGrouping("save-html")

    val localCluster = new LocalCluster()
    val config = new Config
    localCluster.submitTopology("search-crawler", config, topologyBuilder.createTopology())
  }

}
