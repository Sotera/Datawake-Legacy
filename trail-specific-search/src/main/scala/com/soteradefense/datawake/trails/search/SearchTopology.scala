package com.soteradefense.datawake.trails.search

import backtype.storm.topology.TopologyBuilder
import backtype.storm.tuple.Fields
import backtype.storm.{Config, LocalCluster}
import com.soteradefense.datawake.trails.search.bolts.{GoogleSearchBolt, HighLevelKafkaProducer}
import com.soteradefense.datawake.trails.search.data.TrailSearchData
import com.soteradefense.datawake.trails.search.decoder.TrailSearchDataDecoder
import com.soteradefense.datawake.trails.spouts.HighLevelKafkaConsumer

object SearchTopology {

  def main(args: Array[String]): Unit = {
    val topologyBuilder: TopologyBuilder = new TopologyBuilder()
    val zkNodes: String = "192.168.59.103:2181"
    val kafkaBrokers: String = "192.168.59.103:9092"
    val kafkaConsumer = new HighLevelKafkaConsumer[TrailSearchData](
      new Fields("kafkaOrg", "kafkaDomain", "kafkaTrail", "kafkaTerm"),
      new TrailSearchDataDecoder,
      zkNodes,
      "trail-search")

    topologyBuilder.setSpout("search-term-spout", kafkaConsumer)
    topologyBuilder.setBolt("google-search", new GoogleSearchBolt(new Fields("org", "datawake/domain", "trail", "url", "title", "term")))
      .shuffleGrouping("search-term-spout")
    topologyBuilder.setBolt("scrape-kafka", new HighLevelKafkaProducer(kafkaBrokers, "crawler-in"))
      .shuffleGrouping("google-search")
    val localCluster = new LocalCluster()
    val config = new Config
    localCluster.submitTopology("search-crawler", config, topologyBuilder.createTopology())
  }

}