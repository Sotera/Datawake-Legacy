package com.soteradefense.datawake.trails.regex

object RegexWords {

  def getWordCount(words: TraversableOnce[(String, String)], text: String): Int = {
    var rank: Double = 0.0

    words.foreach(entity => {
      val (word, resultCount) = entity
      val weight: Double = 1.0 / Math.log(resultCount.toDouble)
      val searchRegex = word.mkString("(\\W|^)", "|", "(\\W|$)").replace(" ", "\\s").r
      rank += searchRegex.findAllIn(text).size * weight
    })
    rank.asInstanceOf[Int]
  }
}