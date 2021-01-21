$(function(){

  Vue.component('echart', VueECharts);
  Vue.config.devtools = true;

  var setupScroller = function (options){
    var timer = null, 
        isVertical = typeof options.isVertical !== 'undefined' && options.isVertical,
        top = 0;
    options.listCopyed.innerHTML = options.listOri.innerHTML;
    if(!isVertical){
        var listUnitWidth = 0;
        document.getElementsByClassName
        var listItems = options.listOri.childNodes;
        listItems.forEach(function(item){
          var space = document.defaultView.getComputedStyle(item, null)['marginRight']; 
          space = parseInt(space);
          listUnitWidth += ( item.offsetWidth + parseInt(space) );
        });
        options.listOri.style.width += listUnitWidth + 'px';
        options.listCopyed.style.width += listUnitWidth + 'px';
        options.listOri.className += ' horizontal';
        options.listCopyed.className += ' horizontal';
        options.listContainer.style.width += 2 * listUnitWidth + 'px';
    }
    if(typeof options.distance !== 'undefined' && options.distance > 1){
        // 按每组几个一起滚动 水平方向的情况可能不太常见
        timer = setInterval(function(){
            if(isVertical){
                if(options.listContainer.style.top){
                    top = parseInt(options.listContainer.style.top);
                    if(top <= 0){
                        if(Math.abs(top) >= options.listOri.offsetHeight){
                            top = 0;
                        }else{
                            top += -options.distance;
                        }
                        options.listContainer.style.top = top+'px';
                    }
                }else{
                    top = 0;
                    options.listContainer.style.top = top + 'px';
                }
            }
        }, 2000);
    }else{
        if(isVertical){
            options.listContainer.parentElement.className += ' scroll-y';
        }else{
            options.listContainer.parentElement.className += ' scroll-x';
        }

        function animateAction(){
          if(isVertical){
            if(options.listContainer.parentElement.scrollTop == options.listOri.offsetHeight){
                options.listContainer.parentElement.scrollTop = 0;
            }else{
                options.listContainer.parentElement.scrollTop++;
            }
          }else{
            if(options.listContainer.parentElement.scrollLeft == options.listOri.offsetWidth){
                options.listContainer.parentElement.scrollLeft = 0;
            }else{
                options.listContainer.parentElement.scrollLeft++;
            }
          }
        }
        var lastTime = Date.now(),
            diffTime = 20;
        if( window.requestAnimationFrame ){
          (function animloop() {
            if(Date.now() - lastTime > diffTime){
                lastTime = Date.now();
                animateAction();
            }
            window.requestAnimationFrame(animloop);
          })();
        }else{
          timer = setInterval(animateAction, 40);
        }
    }
    return timer;
  };

  var BASEURL = 'http://test.xsd.magcloud.net';

  var map = {
    instance: null,
    zoom: 11,
    mapCenter: [],
    practice_activity: [],
    practice_stand: [],
    // 标记实例的容器数组
    makerIntances: [],
    // 标记点的弹出层
    infoWindow: null,
    districtSearch: null
  };

  new Vue({
    el: '#app',
    data: {
      newsChartOption: {
        color: ['#FFDC4C', '#45ABFF', '#5EFFC3', '#F9456C', '#42DAFF'],
        tooltip: {
            trigger: 'item',
            formatter: '{a} <br/>{b}: {c} ({d}%)'
        },
        title: {
          text: '资讯',
          subtext: 0,
          x: 'center',
          y: '38%',
          textStyle: {
            fontWeight: 'normal',
            fontSize: 20,
            color: '#fff'
          },
          subtextStyle: {
            fontWeight: 'normal',
            fontSize: 24,
            color: '#fff',
          }
        },
        series: [
            {
              name: '资讯统计',
              type: 'pie',
              radius: ['50%', '70%'],
              emphasis: {
                  label: {
                      show: true,
                      fontSize: '30',
                      fontWeight: 'bold'
                  }
              },
              label: {
                fontSize: '16',
                formatter: '{b}\n {c} ({d}%)'
              },
              labelLine: {
                  show: true
              },
              itemStyle: {
                  shadowBlur: 10,
                  shadowOffsetX: 0,
                  shadowColor: 'rgba(0, 0, 0, 0.5)'
              },
              data: []
            }
        ]
      },
      pageData: {
        bigConfig: {},
        bigData: {},
        bigDataRank: {},
        dynamic: []
      },
      showDetailDialog: false,
      detailDialogType: '',
      detailDialogData: {},
    },
    filters: {
      format_index: function(val){
        if( parseInt(val) < 10 ){
          return '0'+val;
        }
        return val;
      }
    },
    created: function() {
      this.getData();
    },
    mounted: function() {
      var me = this;
      this.$nextTick(function(){
        $(document).on('click', function(evt){
          evt.stopPropagation();
          if( $(evt.target).hasClass('js-amap-closeWindow') ){
            me.closePopovers();
          }
          if( $(evt.target).hasClass('js-amap-showDetailDialog') ){
            me.showDetailDialog = true;
          }
        });
      });
    },
    methods: {
      getData: function(){
        var me = this;
        $.when(
          $.getJSON(BASEURL + '/xsd/api/v1/bigData/bigConfig'), 
          $.getJSON(BASEURL + '/xsd/api/v1/bigData/bigData'), 
          $.getJSON(BASEURL + '/xsd/api/v1/bigData/bigDataRank'), 
          $.getJSON(BASEURL + '/cms/api/v1/bigData/dynamic'), 
          $.getJSON(BASEURL + '/cms/api/v1/bigData/bigInfo')
        ).done(function (bigConfig, bigData, bigDataRank, dynamic, bigInfo) {
          me.pageData.bigConfig = bigConfig[0].data;
          me.pageData.bigData = bigData[0].data;
          me.pageData.bigDataRank = bigDataRank[0].list;
          me.pageData.dynamic = dynamic[0];
          me.newsChartOption.series[0].data = bigInfo[0].list.map(function(item){ 
            me.newsChartOption.title.subtext += item.num;
            return {
              name: item.title,
              value: item.num
            }
          });  
          me.$nextTick(function(){
            me.initMap();
            me.initNums();
            me.initScroller1();
            me.initScroller2();
            me.initScroller3();
            me.initScrollerPracticeTrends();
          });
        });
      },
      initMap: function(){
        var me = this;
        $.get(BASEURL+'/xsd/api/v1/bigData/bigDataMap', function(res){
          if( res.success ){
            map.mapCenter = [res.data.practice_center.lng, res.data.practice_center.lat];
            map.practice_activity = res.data.practice_activity;
            map.practice_stand = res.data.practice_stand;

            map.instance = new AMap.Map("mapBox", {
              resizeEnable: true,
              mapStyle: "amap://styles/grey",
              center: map.mapCenter,
              zoom: map.zoom
            });
            me.initMapMaker();
            AMap.plugin(['AMap.DistrictSearch', ''], function(){
              map.districtSearch = new AMap.DistrictSearch({
                level: 'district',
                extensions: 'all',
                subdistrict: 0,
                showbiz: false
              });
              map.districtSearch.search(me.pageData.bigConfig.county, function (status, result) {
                if (status === "complete") {
                  me.getMapPolygonData(result.districtList[0], "district");
                }
              });
            });

          } 
        });
      },
      //获取地图数据，绘制区域图层
      getMapPolygonData: function(data, level){
        var bounds = data.boundaries;
        if (bounds) {
          for (var i = 0, l = bounds.length; i < l; i++) {
            var polygon = new AMap.Polygon({
              map: map.instance,
              strokeWeight: 1,
              strokeColor: "#0091ea",
              fillColor: "#80d8ff",
              fillOpacity: 0.2,
              path: bounds[i]
            });
          }
        }
      },

      initMapMaker: function(){
        var me = this;
        var items = [
          {
            type: 'practice_center',
            lng: map.mapCenter[0],
            lat: map.mapCenter[1],
          }
        ];
        map.practice_activity.forEach(function(item){
          item.type = 'practice_activity';
          items.push(item);
        });
        map.practice_stand.forEach(function(item){
          item.type = 'practice_stand';
          items.push(item);
        });

        items.forEach(function(item){
          var mapContent = '';
          var zIndex=0
          var placeMarker = null;
          switch (item.type) {
            case 'practice_center':
              mapContent = '<div class="map-maker is-center"></div>'
              zIndex = 150;
              break;
            case 'practice_activity':
              mapContent = '<div class="map-maker is-practice_activity"></div>'
              zIndex = 140;
              break;
            case 'practice_stand':
              mapContent = '<div class="map-maker is-practice_stand"></div>'
              zIndex = 130;
              break;
          }
          placeMarker = new AMap.Marker({
            map: map.instance,
            content: mapContent,
            position: [item.lng, item.lat],
            title: item.address || item.contact_address || '',
            offset: new AMap.Pixel(0, 0),
            zIndex: zIndex,
            extData: {
              id: item.id || '',
              type: item.type
            }
          });
          placeMarker.on("click", function (e) {
            var data = e.target.getExtData();
            //获取当前地图级别
            map.mapCenter = map.instance.getCenter();
            var api = '';
            switch (data.type) {
              case 'practice_center':
                api = '/xsd/api/v1/bigData/bigDataPracticeCenter';
                break;
              case 'practice_activity':
                api = '/xsd/api/v1/bigData/bigDataPracticeActivity?id='+data.id;
                break;
              case 'practice_stand':
                api = '/xsd/api/v1/bigData/bigDataPracticeStand?id='+data.id;
                break;
            }
            $.get(BASEURL+api, function(res){
              if( res.success ){
                me.detailDialogData = res.data;
                me.detailDialogType = data.type;
                me.showMakerInfoWindow(data.type, e.target.getPosition(), res.data);    
              } 
            });
          });
          map.makerIntances.push(placeMarker);
        });
      },
      closePopovers: function(){
        map.infoWindow && map.infoWindow.close();
        map.instance.setZoomAndCenter(map.zoom, map.mapCenter); 
      },
      // 点击标记，弹出的地图浮层元素
      showMakerInfoWindow: function(type, position, data){
        var infoHTML = '';
        switch (type) {
          case 'practice_center':
            infoHTML = `<div class="amap-ui-smp-ifwn-container">
                <div class="amap-center">
                  <div class="pj-hide-txt info-title">${data.site_name}</div>
                  <div class="closeWindow js-amap-closeWindow"></div>
                  <div class="showTips-content1">
                    <div class="pj-row">
                      <div class="pj-justify-field">联系人</div>
                      <div class="pj-justify-val">${data.contact_name}</div>
                    </div>
                    <div class="pj-row">
                      <div class="pj-justify-field">联系电话</div>
                      <div class="pj-justify-val">${data.contact_information}</div>
                    </div>
                    <div class="pj-row">
                      <div class="pj-justify-field">所在地址</div>
                      <div class="pj-justify-val">${data.contact_information}</div>
                    </div>
                  </div>
                  <div class="btnContent twoBtnContent">
                    <button class="amap-ui-infowindow-close js-amap-showDetailDialog openPlay ">基本简介</button>
                  </div>
                </div>
              </div>`;
            break;
          case 'practice_activity':
            infoHTML = `<div class="amap-ui-smp-ifwn-container">
                <div class="amap-center">
                  <div class="pj-hide-txt info-title">${data.title}</div>
                  <div class="closeWindow js-amap-closeWindow"></div>
                  <div class="showTips-content1">
                    <div class="pj-row">
                      <div class="pj-justify-field">活动类型</div>
                      <div class="pj-justify-val">${data.support_type_name}</div>
                    </div>
                    <div class="pj-row">
                      <div class="pj-justify-field">活动对象</div>
                      <div class="pj-justify-val">${data.support_person_name}</div>
                    </div>
                    <div class="pj-row">
                      <div class="pj-justify-field">发起团队</div>
                      <div class="pj-justify-val">${data.team_name}</div>
                    </div>
                  </div>
                  <div class="btnContent twoBtnContent">
                    <button class="amap-ui-infowindow-close js-amap-showDetailDialog openPlay ">基本简介</button>
                  </div>
                </div>
              </div>`;
            break;
          case 'practice_stand':
            infoHTML = `<div class="amap-ui-smp-ifwn-container">
                <div class="amap-center">
                  <div class="pj-hide-txt info-title">${data.title}</div>
                  <div class="closeWindow js-amap-closeWindow"></div>
                  <div class="showTips-content1">
                    <div class="pj-row">
                      <div class="pj-justify-field">联系人</div>
                      <div class="pj-justify-val">${data.contact_name}</div>
                    </div>
                    <div class="pj-row">
                      <div class="pj-justify-field">联系电话</div>
                      <div class="pj-justify-val">${data.contact_phone}</div>
                    </div>
                    <div class="pj-row">
                      <div class="pj-justify-field">所在地址</div>
                      <div class="pj-justify-val">${data.contact_address}</div>
                    </div>
                  </div>
                  <div class="btnContent twoBtnContent">
                    <button class="amap-ui-infowindow-close js-amap-showDetailDialog openPlay ">基本简介</button>
                  </div>
                </div>
              </div>`;
            break;
        }

        map.infoWindow = new AMap.InfoWindow({
          isCustom: true,
          autoMove: true,
          anchor: 'bottom-center',
          content: infoHTML,
          offset: new AMap.Pixel(0, 0)
        });
        map.infoWindow.open(map.instance, position);
      },

      initScrollerPracticeTrends: function(){
        var timer = setupScroller({
          isVertical: false,
          listContainer: this.$refs.listContainerPracticeTrends,
          listCopyed: this.$refs.listCopyedPracticeTrends,
          listOri: this.$refs.listOriPracticeTrends
        });
      },
      initScroller3: function(){
        var timer = setupScroller({
          isVertical: true,
          listContainer: this.$refs.listContainer3,
          listCopyed: this.$refs.listCopyed3,
          listOri: this.$refs.listOri3
        });
      },
      initScroller2: function(){
        var timer = setupScroller({
          isVertical: true,
          listContainer: this.$refs.listContainer2,
          listCopyed: this.$refs.listCopyed2,
          listOri: this.$refs.listOri2
        });
      },
      initScroller1: function(){
        var timer = setupScroller({
          isVertical: true,
          listContainer: this.$refs.listContainer1,
          listCopyed: this.$refs.listCopyed1,
          listOri: this.$refs.listOri1
        });
      },
      initNums: function(){
        $('.counter').countUp();
      }
    },
  });

});