package com.soteradefense.datawake.trails.rank

import java.sql.{Connection, PreparedStatement}

import com.soteradefense.datawake.trails.exception.DatawakeException
import com.soteradefense.datawake.trails.topology.rank.bolt.ComputeUrlRankBolt
import org.slf4j.{LoggerFactory, Logger}

import scala.collection.mutable.ListBuffer
object DatawakeUrlRankHelper {
  var logger: Logger = LoggerFactory.getLogger(classOf[ComputeUrlRankBolt])

  /**
   * Gets the url rank for a specific url.
   * @param validWords Words that positively count toward the rank.
   * @param invalidWords Words that negatively count toward the rank.
   * @param text The html as a string
   * @return Tuple2(Rank, List of Entities Found on the page)
   */
  def getTotalUrlRank(validWords: TraversableOnce[(String, Double)], invalidWords: TraversableOnce[(String, Double)], text: String): (Double, List[(String, Int)]) = {
    val (positiveRank, positiveEntities) = getPositiveRank(validWords, text)
    val (finalRank, negativeEntities) = getNegativeRank(invalidWords, text, positiveRank)
    positiveEntities ++= negativeEntities
    (finalRank, positiveEntities.toList)
  }

  /**
   * Gets the positive rank for a specific url.
   * @param validWords Words to look for in the text.
   * @param text The html as a string
   * @param startingRank Starting rank for counting the entities (Defaults to 0.0)
   * @return Tuple2(Rank, words found on the page)
   */
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

  /**
   * Gets the negative rank for a specific url
   * @param invalidWords Words that count against the rank.
   * @param text The html as a string
   * @param startingRank Starting rank (Defaults to 0.0)
   * @return Tuple2(Rank, words found on the page)
   */
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

  /**
   * Gets the stored page rank for a url
   * @param org Org associated with the url
   * @param domain Domain associated with the url
   * @param trail Trail associated with the url
   * @param url Url to look up.
   * @param pageRankSelectSql The sql that selects the page rank.
   * @param connection sql Connection that connects to the database.
   * @return
   */
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

  /**
   * Computes the log base 2 of a number.
   * @param x Number to calculate
   * @return log2(x)
   */
  def log2(x: Double) = Math.log(x) / Math.log(2)
}
