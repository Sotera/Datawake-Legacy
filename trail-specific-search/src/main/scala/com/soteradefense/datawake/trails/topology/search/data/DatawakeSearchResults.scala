package com.soteradefense.datawake.trails.topology.search.data

import scala.collection.mutable

case class DatawakeSearchResults (results: mutable.HashSet[DatawakeInternetResult], estimatedResultCount: String)
