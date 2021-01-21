# bigscreen
大屏页面，具有地图展示以及一些动态资讯的展示
[线上测试地址](http://test.xsd.magcloud.net/bigscreen/home)

## 使用框架
- jQuery
- Vue
- 高德地图js-sdk
- Echarts

## 特点
- 为了适配大屏，尺寸单位使用了vw、vh，按效果图的1920*1080进行换算；
- 使用jQuery的 **$.when** 对多个请求进行并发处理；
- 使用 **requestAnimationFrame** 优化页面中的滚动动画；
- 使用高德地图js-sdk，绘制Marker、InfoWindow，使用DistrictSearch获取区域坐标，进行Polygon渲染；
- 水平、竖直方向的滚动动画，使用DOM元素原生的scrollLeft、scrollTop进行；

### 可以优化的点
- 文本的font-size暂时未做响应式，用了固定的px单位，可使用flexible.js，根据根节点利用rem计算


### 开发时间
< 2个工作日；