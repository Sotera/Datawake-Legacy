package com.soteradefense.datawake.trails.regex

object RegexWords {

  def getRank(validWords: TraversableOnce[(String, Double)], invalidWords: TraversableOnce[(String, Double)], text: String): Double = {
    var rank: Double = 0.0
    rank = validWords.foldLeft(rank)((r: Double, entity: (String, Double)) => {
      val (word, resultCount) = entity
      var wordRank = 0.0
      val searchRegex = "\\s?[^a-zA-Z0-9\\_](?i)" + word + "(?-i)[^a-zA-Z0-9\\_]"
      if (searchRegex.r.findFirstIn(text) != None) {
        wordRank += resultCount
      }
      r + wordRank
    })
    rank = invalidWords.foldLeft(rank)((r: Double, entity: (String, Double)) => {
      val (word, resultCount) = entity
      var wordRank = 0.0
      val searchRegex = "\\s?[^a-zA-Z0-9\\_](?i)" + word + "(?-i)[^a-zA-Z0-9\\_]"
      if (searchRegex.r.findFirstIn(text) != None) {
        wordRank += resultCount
      }
      r - wordRank
    })
    rank
  }

  def log2(x: Double) = Math.log(x) / Math.log(2)
}