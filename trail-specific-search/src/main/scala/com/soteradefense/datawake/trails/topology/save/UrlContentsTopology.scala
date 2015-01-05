package com.soteradefense.datawake.trails.topology.save

import backtype.storm.topology.TopologyBuilder
import backtype.storm.tuple.Fields
import backtype.storm.{Config, LocalCluster}
import com.soteradefense.datawake.trails.constants.DatawakeConstants
import com.soteradefense.datawake.trails.exception.DatawakeException
import com.soteradefense.datawake.trails.spouts.HighLevelKafkaConsumer
import com.soteradefense.datawake.trails.sql.SqlCredentials
import com.soteradefense.datawake.trails.topology.save.bolt.{SaveRawHtmlBolt, SaveUrlBolt, UpdateUrlKafkaProducer}
import com.soteradefense.datawake.trails.topology.save.data.DatawakeCrawlerData
import com.soteradefense.datawake.trails.topology.save.decoder.DatawakeCrawlerDataDecoder

object UrlContentsTopology {
  def main(args: Array[String]): Unit = {
    val topologyBuilder: TopologyBuilder = new TopologyBuilder()

    val useDistributedCrawler: Boolean = sys.env.getOrElse("DW_USE_DISTRIBUTED", "false").toBoolean
    val crawlerTopic: String = if(useDistributedCrawler) DatawakeConstants.CRAWLER_TOPIC else sys.env.getOrElse("DW_CRAWLER_OUT", throw new DatawakeException("You need to set the local crawler out topic"))
    val kafkaConsumer = new HighLevelKafkaConsumer[DatawakeCrawlerData](
      new Fields("kafkaOrg", "kafkaDomain", "kafkaTrail", "kafkaLink", "kafkaHtml", "kafkaTitle", "kafkaRank"),
      new DatawakeCrawlerDataDecoder,
      crawlerTopic, "trail-save-html-contents-listener")



    val jdbc = sys.env.getOrElse("DW_DB_JDBC", throw new DatawakeException("You need to set your JDBC String for interacting with a database."))
    val sqlUser = sys.env.getOrElse("DW_DB_USER", throw new DatawakeException("You need to set your database username."))
    val sqlPassword = sys.env.getOrElse("DW_DB_PASSWORD", throw new DatawakeException("You need to set your database password."))
    val sqlCredentials = new SqlCredentials(jdbc, sqlUser, sqlPassword)

    topologyBuilder.setSpout("html-contents-spout",
      kafkaConsumer)

    val insertRawHtmlSql = """INSERT INTO trail_entities_contents(url, html) VALUES(?,?)"""
    val insertTrailTermRankSql: String = """INSERT INTO trail_term_rank(org, domain, trail, url, title, rank, pageRank) VALUES(?,?,?,?,?,?,?)"""

    topologyBuilder.setBolt("save-html", new SaveRawHtmlBolt(sqlCredentials, insertRawHtmlSql, new Fields("sqlOrg", "sqlDomain", "sqlTrail", "sqlUrl", "sqlTitle", "sqlRank")))
      .shuffleGrouping("html-contents-spout")

    topologyBuilder.setBolt("save-url", new SaveUrlBolt(sqlCredentials, insertTrailTermRankSql, new Fields("org", "domain", "trail", "url")))
      .shuffleGrouping("save-html")
    val kafkaBrokers = sys.env.get("DW_KAFKA_BROKERS")

    topologyBuilder.setBolt("count-link", new UpdateUrlKafkaProducer("update-url",kafkaBrokers.getOrElse(throw new DatawakeException("Your Kafka Brokers are not set!"))))
      .shuffleGrouping("save-url")

    val localCluster = new LocalCluster()
    val config = new Config
    val zkQuorum = if(useDistributedCrawler) sys.env.get("DW_ZK_QUORUM") else sys.env.get("DW_LOCAL_ZK_QUORUM")
    config.put(DatawakeConstants.ZK_NODES_ID, zkQuorum.getOrElse(throw new DatawakeException("Your Zookeeper nodes were not set!")))
    localCluster.submitTopology("search-crawler", config, topologyBuilder.createTopology())
  }

}