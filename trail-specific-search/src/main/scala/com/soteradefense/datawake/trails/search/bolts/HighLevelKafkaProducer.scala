package com.soteradefense.datawake.trails.search.bolts

import java.util
import java.util.{Properties, UUID}

import backtype.storm.task.TopologyContext
import backtype.storm.topology.base.BaseBasicBolt
import backtype.storm.topology.{BasicOutputCollector, OutputFieldsDeclarer}
import backtype.storm.tuple.Tuple
import com.soteradefense.datawake.trails.constants.DatawakeConstants
import kafka.producer.{KeyedMessage, Producer, ProducerConfig}
import net.liftweb.json.JsonDSL._
import net.liftweb.json._

class HighLevelKafkaProducer(kafkaBrokers: String, topic: String) extends BaseBasicBolt {
  var kafkaProducer: Producer[String, String] = null

  override def prepare(stormConf: util.Map[_, _], context: TopologyContext): Unit = {
    super.prepare(stormConf, context)
    kafkaProducer = new Producer[String, String](createProducerConfig)
  }

  override def execute(input: Tuple, collector: BasicOutputCollector): Unit = {
    val builder = new StringBuilder
    val org = input.getStringByField("org")
    val domain = input.getStringByField("domain")
    val trail = input.getStringByField("trail")
    val url = input.getStringByField("url")
    val title = input.getStringByField("title")
    val term = input.getStringByField("term")
    val json = ("id" -> UUID.randomUUID().toString) ~
      ("appid" -> DatawakeConstants.APPID) ~
      ("url" -> url) ~
      ("attrs" ->
        ("org" -> org) ~
          ("domain" -> domain) ~
          ("trail" -> trail) ~
          ("title" -> title) ~
          ("term" -> term)
        )
    val attrJson: String = compact(render(json))

    val message = new KeyedMessage[String, String](topic, attrJson)
    kafkaProducer.send(message)
  }

  override def declareOutputFields(declarer: OutputFieldsDeclarer): Unit = {
    //Do Nothing
  }

  def createProducerConfig: ProducerConfig = {
    val props = new Properties()

    props.put("metadata.broker.list", kafkaBrokers)
    props.put("serializer.class", "kafka.serializer.StringEncoder")
    props.put("request.required.acks", "1")

    new ProducerConfig(props)
  }


  override def cleanup(): Unit = {
    super.cleanup()
    if (kafkaProducer != null)
      kafkaProducer.close()
  }
}
