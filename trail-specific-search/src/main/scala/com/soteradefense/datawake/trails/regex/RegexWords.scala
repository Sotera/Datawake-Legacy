package com.soteradefense.datawake.trails.regex

object RegexWords {

  def getWordCount(words: TraversableOnce[(String, Double)], text: String): Double = {
    var rank: Double = 0.0

    words.foreach(entity => {
      val (word, resultCount) = entity
      val weight: Double = 1.0 / Math.log(resultCount)
      val searchRegex = "\\s?[^a-zA-Z0-9\\_](?i)" + word + "(?-i)[^a-zA-Z0-9\\_]"
      if (searchRegex.r.findFirstIn(text) != None) {
        rank += weight
      }
    })
    rank
  }

}