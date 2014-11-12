(ns kafka-topo
    (:use [backtype.storm.clojure]
        [streamparse.specs])
    (:import [storm.kafka SpoutConfig
         KafkaSpout
         StringScheme
         ZkHosts]
;;    [storm.kafka.bolt.selector DefaultTopicSelector ]
;;    [storm.kafka.bolt.mapper FieldNameBasedTupleToKafkaMapper]
    [storm.kafka.bolt KafkaBolt]
    [backtype.storm.spout SchemeAsMultiScheme])
    (:gen-class)
)


(def zk (ZkHosts. "localhost:2181"))
(def zkroot "/storm")

;; Java Interop code that creates a JVM KafkaSpout
(defn kafka-spout [topic consumer]
    (let [config (SpoutConfig. zk topic zkroot consumer)]
        (set! (.scheme config) (SchemeAsMultiScheme. (StringScheme.)))
        (KafkaSpout. config)))

;; Java Interop code that creates a JVM KafkaBolt
;;(defn dw-visited-incoming [topic]
;;    (let [selector (new DefaultTopicSelector topic)
;;        mapper (FieldNameBasedTupleToKafkaMapper.)
;;         bolt (KafkaBolt.)
;;        selected-bolt (.withKafkaTopicSelector bolt selector)
;;        mapped-bolt (.withTupleToKafkaMapper selected mapper)]
;;    mapped-bolt))



(def incoming-dw-visited-spout
    (kafka-spout "memex-datawake-visited" "memex-datawake-visited-consumer"))


(def crawler-in-spout
    (kafka-spout "crawler-in" "crawler-in"))


(def crawler-out-spout
    (kafka-spout "crawler-out" "crawler-out"))

;;(def outgoing-dw-lookahead-urls-bolt
 ;;   (new KafkaBolt))





;; ===================
;; Topology Definition
;; ===================



(defn kafka-topo [options]
[

     ;;spout configuration
    {

    ;; DATAWAKE VISITED
    ;; listen for pages visted by the datawake
    "incoming-dw-visited-spout" (spout-spec
        incoming-dw-visited-spout
        :p 1)


    ;; CRAWLER IN
    ;; listen for urls sent to be crawled
    "incoming-crawler-spout" (spout-spec
        crawler-in-spout
        :p 1)


    ;; CRALWER OUT / DATAWAKE LOOKAHEAD
    ;; listen for pages that have been crawled
    "outgoing-crawler-spout" (spout-sepc
        crawler-out-spout
        :p 1)

    }


    ;; bolt configuration
    {




    }
]
)