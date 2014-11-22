function DatawakeInfo(org, domain, trail){
    this.org = org;
    this.domain = domain;
    this.trail = trail;
}

DatawakeInfo.prototype = {
    getDomain: function(){
        return this.domain;
    },
    getTrail: function(){
        return this.trail;
    },
    getOrg: function(){
        return this.org;
    },
    setDomain: function(domain){
        this.domain = domain;
    },
    setTrail: function(trail){
        this.trail = trail;
    },
    setOrg: function(org){
        this.org = org;
    }
};