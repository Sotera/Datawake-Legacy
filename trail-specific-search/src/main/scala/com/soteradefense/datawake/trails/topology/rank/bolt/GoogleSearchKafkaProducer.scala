package com.soteradefense.datawake.trails.topology.rank.bolt

import backtype.storm.topology.BasicOutputCollector
import backtype.storm.tuple.Tuple
import com.soteradefense.datawake.trails.bolts.HighLevelKafkaProducer
import kafka.producer.KeyedMessage

import scala.collection.mutable

class GoogleSearchKafkaProducer(kafkaBrokers: String, topic: String) extends HighLevelKafkaProducer(kafkaBrokers, topic) {
  val termsSearched: mutable.Map[String, mutable.HashSet[String]] = new mutable.HashMap[String, mutable.HashSet[String]]

  override def execute(input: Tuple, collector: BasicOutputCollector): Unit = {
    val domainTriplet = input.getStringByField("domainTriplet")
    val term = input.getStringByField("term")
    val searchedTermsSet: mutable.Set[String] = termsSearched.getOrElse(domainTriplet, new mutable.HashSet[String])
    if (!searchedTermsSet.contains(term)) {
      val builder = new StringBuilder()
      builder.append(domainTriplet)
      builder.append("\0")
      builder.append(term)
      builder.append("\0")
      builder.append("true")
      val messageContents = builder.toString()
      val message = new KeyedMessage[String, String](topic, messageContents)
      kafkaProducer.send(message)
      searchedTermsSet.add(term)
      termsSearched.put(domainTriplet, searchedTermsSet.asInstanceOf[mutable.HashSet[String]])
    }
  }
}
