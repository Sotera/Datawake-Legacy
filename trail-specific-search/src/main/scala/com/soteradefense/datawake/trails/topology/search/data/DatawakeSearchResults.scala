package com.soteradefense.datawake.trails.topology.search.data

import scala.collection.mutable

case class DatawakeSearchResults (results: mutable.ListBuffer[DatawakeInternetResult], estimatedResultCount: String)