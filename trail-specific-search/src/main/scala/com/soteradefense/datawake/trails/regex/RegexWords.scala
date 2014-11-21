package com.soteradefense.datawake.trails.regex

object RegexWords {

  def getWordCount(words: TraversableOnce[String], text: String): Int = {
    val searchRegex = words.mkString("(\\W|^)", "|", "(\\W|$)").replace(" ", "\\s").r
    println(searchRegex.toString())
    searchRegex.findAllIn(text).size
  }
}