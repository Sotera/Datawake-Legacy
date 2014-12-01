package com.soteradefense.datawake.trails.topology.search.bolts

import java.util.UUID

import backtype.storm.topology.BasicOutputCollector
import backtype.storm.tuple.Tuple
import com.soteradefense.datawake.trails.bolts.HighLevelKafkaProducer
import com.soteradefense.datawake.trails.constants.DatawakeConstants
import kafka.producer.KeyedMessage
import net.liftweb.json.JsonDSL._
import net.liftweb.json._

class CrawlerKafkaProducer(kafkaBrokers: String, topic: String) extends HighLevelKafkaProducer(kafkaBrokers, topic) {

  override def execute(input: Tuple, collector: BasicOutputCollector): Unit = {
    val builder = new StringBuilder
    val org = input.getStringByField("org")
    val domain = input.getStringByField("domain")
    val trail = input.getStringByField("trail")
    val url = input.getStringByField("url")
    val title = input.getStringByField("title")
    val json = ("id" -> UUID.randomUUID().toString) ~
      ("appid" -> DatawakeConstants.APPID) ~
      ("url" -> url) ~
      ("attrs" ->
        ("org" -> org) ~
          ("domain" -> domain) ~
          ("trail" -> trail) ~
          ("title" -> title)
        )
    val attrJson: String = compact(render(json))

    val message = new KeyedMessage[String, String](topic, attrJson)
    kafkaProducer.send(message)
  }

}
