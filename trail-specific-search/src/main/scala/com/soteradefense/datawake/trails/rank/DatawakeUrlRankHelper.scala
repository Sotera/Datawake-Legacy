package com.soteradefense.datawake.trails.rank

import java.sql.{Connection, PreparedStatement}

import com.soteradefense.datawake.trails.exception.DatawakeException
import com.soteradefense.datawake.trails.topology.rank.bolt.ComputeUrlRankBolt
import org.slf4j.{LoggerFactory, Logger}

import scala.collection.mutable.ListBuffer
object DatawakeUrlRankHelper {
  var logger: Logger = LoggerFactory.getLogger(classOf[ComputeUrlRankBolt])

  def getTotalUrlRank(validWords: TraversableOnce[(String, Double)], invalidWords: TraversableOnce[(String, Double)], text: String): (Double, List[(String, Int)]) = {
    val (positiveRank, positiveEntities) = getPositiveRank(validWords, text)
    val (finalRank, negativeEntities) = getNegativeRank(invalidWords, text, positiveRank)
    positiveEntities ++= negativeEntities
    (finalRank, positiveEntities.toList)
  }

  def getPositiveRank(validWords: TraversableOnce[(String, Double)], text: String, startingRank: Double = 0.0): (Double, ListBuffer[(String, Int)]) = {
    val buffer = new ListBuffer[(String, Int)]
    (validWords.foldLeft(startingRank)((r: Double, entity: (String, Double)) => {
      val (word, resultCount) = entity
      var wordRank = 0.0
      val searchRegex = "\\s?[^a-zA-Z0-9\\_](?i)" + word + "(?-i)[^a-zA-Z0-9\\_]"
      if (searchRegex.r.findFirstIn(text) != None) {
        wordRank += resultCount
        buffer += Tuple2(word,0)
      }
      r + wordRank
    }), buffer)
  }

  def getNegativeRank(invalidWords: TraversableOnce[(String, Double)], text: String, startingRank: Double = 0.0): (Double, ListBuffer[(String, Int)]) = {
    val buffer = new ListBuffer[(String, Int)]
    (invalidWords.foldLeft(startingRank)((r: Double, entity: (String, Double)) => {
      val (word, resultCount) = entity
      var wordRank = 0.0
      val searchRegex = "\\s?[^a-zA-Z0-9\\_](?i)" + word + "(?-i)[^a-zA-Z0-9\\_]"
      if (searchRegex.r.findFirstIn(text) != None) {
        wordRank += resultCount
        buffer += Tuple2(word,1)

      }
      r - wordRank
    }), buffer)
  }

  def getPageRank(org: String, domain: String, trail: String, url: String, pageRankSelectSql: String, connection: Connection): Int = {
    var countPrepare: PreparedStatement = null
    try {
      countPrepare = connection.prepareStatement(pageRankSelectSql)
      countPrepare.setString(1, org)
      countPrepare.setString(2, domain)
      countPrepare.setString(3, trail)
      countPrepare.setString(4, url)
      val resultSet = countPrepare.executeQuery()
      if (resultSet.next()) {
        resultSet.getInt("pageRank")
      } else {
        -1
      }
    } finally {
      if (countPrepare != null)
        countPrepare.close()
    }
  }

  def log2(x: Double) = Math.log(x) / Math.log(2)
}
