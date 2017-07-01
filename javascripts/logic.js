
/* 名字空间模块 */
var app = {
	util: {},
	EventUtil: {},
	cookie: {},
	ajax: {}
};
/* 工具方法模块 */
app.util = {
	$: function (selector, node) {
		return (node || document).querySelector(selector);
	},
	$$: function (selector,node) {
		return (node || document).querySelectorAll(selector);
	},
	addClass: function (element, value) {
		if (!element.className) {
			element.className = value;
		} else {
			element.className += ' ' + value;
		}
	},
	removeClass: function (element, value) {
		var className = element.className,
		    arr = className.split(' ');
		for (var i = 0; i < arr.length; ) {
			if (value === arr[i]) {
				arr.splice(i, 1);
			} else {
				i++;
			}
		}
		element.className = arr.join(' ');
	}	
};
/* 事件工具方法模块 */
app.EventUtil = {
	addHandler: function (node, event, handler) {
		if (!!node.addEventListener) {
		    node.addEventListener(event, handler, false);
		} else if (!!node.attachEvent) {
		    node.attachEvent('on' + event, handler);
		} else {
			node['on' + event] = handler;
		}
	},
	removeHandler: function (node, event, handler) {
		if (!!node.removeEventListener) {
		    node.removeEventListener(event, handler, false);
		} else if (!!node.detachEvent) {
		    node.detachEvent('on' + event, handler);
		} else {
			node['on' + event] = null;
		}
	},
	getEvent: function (event) {
		return event ? event : window.event;
	},
	getTarget: function (event) {
		return event.target || event.srcElement;
	}
};
/* cookie操作模块 */
app.cookie = {
	getCookies: function () {
		var cookieObj = {};
		var cookie = document.cookie;
		if (cookie === '') {
			return cookieObj;
		}
		var list = cookie.split("; ");
		for (var i = 0; i < list.length; i++) {
			var item = list[i];
			var pos = item.indexOf('=');
			var name = item.substring(0, pos);
			name = decodeURIComponent(name);
			var value = item.substring(pos + 1);
			value = decodeURIComponent(value);
			cookieObj[name] = value;
		}
		return cookieObj;
	},
	removeCookie: function (name, path, domain) {
		document.cookie = name + 
		"=; path=" + (path || '') + 
		"; domain=" + (domain || '')+ 
		"; max-age=0";
	},
	setCookie: function (name, value, expires, path, domain, secure) {
		var cookie = encodeURIComponent(name) + '=' + encodeURIComponent(value);
		if (expires)
			cookie += '; expires=' + expires.toGMTString();
		if (path)
			cookie += '; path=' + path;
		if (domain)
			cookie += '; domain=' + domain;
		if (secure)
			cookie += '; secure=' + secure;
		document.cookie = cookie;
		console.log(cookie);
	}
};
/* Ajax通信方法模块 */
app.ajax = {
	get: function (url, options, callback) {
		var xhr;
		if (window.XMLHttpRequest) {
			xhr = new XMLHttpRequest();	// 兼容IE7+,Firefox,Chrome,Opera,Safari
		} else {
			xhr = new ActiveXObject('Microsoft.XMLHTTP'); // 兼容IE6,IE5
		}
        xhr.onreadystatechange = function (event) {
        	if (xhr.readyState == 4) {
        		// callback('1');
        		if ((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304) {
        			callback(xhr.responseText);
        		} else {
        			alert('request was unsuccessful: ' + xhr.status);
        		}
        	}
        };
        var seriUrl = url + '?' + app.ajax.serialize(options);
        xhr.open('get', seriUrl, true);
        xhr.send(null);
	},
	serialize: function (options) {
		if (options == {}) return '';
		var pairs = [], name, value;
		for (name in options) {
			if (!options.hasOwnProperty(name)) continue; // 过滤掉原型属性和方法
			if (typeof options[name] === 'function') continue; // 过滤掉自己的方法
			value = options[name].toString();
			name = encodeURIComponent(name);
			value = encodeURIComponent(value);
			pairs.push(name + '=' + value);
		}
		return pairs.join('&'); // 返回最终的查询参数字符串
	}
};

/* 页面逻辑设置 */
(function (util, EventUtil, cookie, ajax) {
	var $ = util.$,
	    $$ = util.$$,
	    addClass = util.addClass,
	    removeClass = util.removeClass,
	    addHandler = EventUtil.addHandler,
	    removeHandler = EventUtil.removeHandler,
	    getEvent = EventUtil.getEvent,
	    getTarget = EventUtil.getTarget,
	    setCookie = cookie.setCookie,
	    getCookies = cookie.getCookies,
	    removeCookie = cookie.removeCookie,
	    get = ajax.get;
	var coursesObj = {},	 // 保存请求课程列表时返回数据转化后的对象
		hotCourArr = [],	 // 保存请求热门课程时返回数据转化后的数组
		type = 10,		 	 // type为课程的类型
		tabChange = true, 	 // tabChange为课程tab改变时的标志
		follow,		 		 // 关注按钮
		content, courses,    // 课程内容节点和课程列表节点
		hotList, moveCont;	 // 热门推荐列表节点和热门课程移动容器
	/* 轮播图片淡入动画 */
	function fadeIn (ele, interval, fadeTime, callback) {
		var stepOpacity = 1/(fadeTime/interval);
		var step = function () {
			var opa = ele.style.opacity + stepOpacity;
			if (opa < 1) {
				ele.style.opacity = opa;
			} else {
				clearInterval(intervalId);
				ele.style.opacity = 1;
				if (callback) callback();
			}
		};
		var intervalId = setInterval(step, interval);
	}
	/* 滚动热门课程动画 */
	function moveCourse (duration, interval, moveTime, distance, callback) {
		var stepLen = Math.floor(distance/(moveTime/interval));
		var cour = moveCont.getElementsByClassName('m-hotCour')[0];
		var step = function () {
			var len = Math.abs(parseInt(moveCont.style.top)) + stepLen;
			if (len < distance) {
				moveCont.style.top = '-' + len + 'px';
			} else {
				clearInterval(intervalId);
				moveCont.removeChild(cour);
				moveCont.style.top = '0px';
				if (callback) callback();
			}
		}; 
		var intervalId = setInterval(step, interval);
	}	
	/* 关注API */
	function followAPI () {
		get('http://study.163.com/webDev/attention.htm', {}, function (response) {
			 	if (response === '1') {
					setCookie('followSuc', 'true');
					follow.innerHTML = '已关注' + '<a class="unfollow">取消</a>';
					addClass(follow, 'followed');
					follow.disabled = true; 
					var unfollowHandler = function (event) {
						// removeCookie('followSuc');
						follow.innerHTML = '+ 关注';
						removeClass(follow, 'followed');
						var enable = function () {
							follow.disabled = false;
						};
						setTimeout(enable, 300);  
					};
					addHandler($('.unfollow', follow), 'click', unfollowHandler);
					console.log('follow successfully');
				}
		});	
	}	
	/* 登录请求验证 */
	function loginValidate (response) {
		if (response === '1') {
			var modal = $('.m-logMod');
			document.body.removeChild(modal);
			setCookie('loginSuc', 'true');
			console.log('login successfully');			
			followAPI();
		} else if (response === '0') {
			var form = $('.m-logMod #login');
			var error = document.createElement('span');
			var errText = document.createTextNode('用户名或密码错误！');
			error.appendChild(errText);
			error.style.position = 'absolute';
			error.style.left = '40px';
			error.style.bottom = '88px';
			error.style.color = 'red';
			form.appendChild(error);
			/* 为表单添加输入事件 */				
			var inputHandler = function (event) {
					form.removeChild(error);
					removeHandler(form, 'input', inputHandler);				
			};
			addHandler(form, 'input', inputHandler);	
		}
	}
	/* 创建登录弹窗及iframe */
	function creLoginMod (callback) {
		var modal = document.createElement('div');
		modal.className = 'm-modal m-logMod';
		var form = document.createElement('form');
		form.id = 'login';
		form.action = 'http://study.163.com/webDev/login.htm';
		form.target = logIframe;
		modal.appendChild(form);
		var logIframe = document.createElement('iframe');
		logIframe.id = 'logIframe';
		logIframe.name = 'logIframe';
		modal.appendChild(logIframe);
		var headline = document.createElement('h3');
		headline.innerHTML = '登录网易云课堂';
		form.appendChild(headline);
		var username = document.createElement('input');
		username.type = 'text';
		username.id = 'username';
		username.required = 'true';
		username.placeholder = '用户名';
		form.appendChild(username);
		var para = document.createElement('p');
		var password = document.createElement('input');
		password.type = 'password';
		password.id = 'password';
		password.required = 'true';
		password.placeholder = '密码';
		para.appendChild(password);
		form.appendChild(para);
		var loginBtn = document.createElement('button');
		loginBtn.innerHTML = '登录';
		form.appendChild(loginBtn);
		var closeBtn = document.createElement('i');
		closeBtn.className = 'close';
		form.appendChild(closeBtn);
		document.body.appendChild(modal);
		/* 为登录按钮添加点击事件 */
		var loginHandler = function (event) {
			var hexName = md5.hex(username.value),
				hexPsword = md5.hex(password.value);
			var inforObj = {
				userName: hexName,
				password: hexPsword
			};
			get('http://study.163.com/webDev/login.htm', inforObj, callback);
		};
		addHandler(loginBtn, 'click', loginHandler);
		/* 为关闭按钮添加点击事件 */
		var closeHandler = function (event) {
			document.body.removeChild(modal);
		};
		addHandler(closeBtn, 'click', closeHandler);	
		/* 为iframe添加加载事件 */
		var ifrHandler = function (event) {
			try {
				var result = JSON.parse(logIframe.contentWindow.document.body.contentText);
				console.log(result);
			} catch (err) {
				console.log('error');
			}
		};	
		addHandler(logIframe, 'load', ifrHandler);	
	}
	/* 创建视频弹窗 */
	function creVideoMod ()	{
		var modal = document.createElement('div');
		modal.className = 'm-modal m-videoMod';
		var videoCont = document.createElement('div');
		videoCont.id = 'videoCont';
		modal.appendChild(videoCont);
		var headline = document.createElement('h3');
		headline.innerHTML = '请观看下面的视频';
		var video = document.createElement('video');
		video.controls = true;
		var source = document.createElement('source');
		source.src = "http://mov.bn.netease.com/open-movie/nos/mp4/2014/12/30/SADQ86F5S_shd.mp4";
		source.type = 'video/mp4';
		video.appendChild(source);
		var closeBtn = document.createElement('i');
		closeBtn.className = 'close';
		videoCont.appendChild(headline);
		videoCont.appendChild(video);
		videoCont.appendChild(closeBtn);
		document.body.appendChild(modal); 
		/* 为关闭按钮添加点击事件 */
		var closeHandler = function (event) {
			document.body.removeChild(modal);
		};
		addHandler(closeBtn, 'click', closeHandler);
	}	

	/* course对象构造函数 */
	function Course (inforObj) {
		var course = document.createElement('div');
		course.className = 'm-course';
		course.title = inforObj.name;
		course.courseObj = this;
		var img = document.createElement('img');
		img.src = inforObj.middlePhotoUrl;
		course.appendChild(img);
		var bri_intro = document.createElement('div');
		bri_intro.className = 'brief_intro';
		var name = document.createElement('h4');
		name.className = 'name';
		name.innerHTML = inforObj.name;
		var provider = document.createElement('p');
		provider.className = 'provider';
		provider.innerHTML = inforObj.provider;
		var learner = document.createElement('span');
		learner.className = 'learnerCount';
		learner.innerHTML = inforObj.learnerCount;
		var price = document.createElement('p');
		price.className = 'price';
		price.innerHTML = (inforObj.price === 0) ? '免费' : ('&yen; ' + inforObj.price);
		bri_intro.appendChild(name);
		bri_intro.appendChild(provider);
		bri_intro.appendChild(learner);
		bri_intro.appendChild(price);
		course.appendChild(bri_intro);
		courses.appendChild(course);
		this.course = course;
		this.inforObj = inforObj;
		this.addEvent();
	}
	/* 为course对象添加增添事件方法 */
	Course.prototype.addEvent = function () {
		/* 为课程添加mouseenter事件 */
		var enterHandler = function (event) {
			event = getEvent(event);
			var target = getTarget(event);
			this.creCard(target);
		}.bind(this);
		addHandler(this.course, 'mouseenter', enterHandler);
		/* 为课程添加mouseleave事件 */
		var leaveHandler = function (event) {
			event = getEvent(event);
			var target = getTarget(event);
			this.remvCard(target);
		}.bind(this);
		addHandler(this.course, 'mouseleave', leaveHandler);
	};
	/* 为course对象添加创建卡片方法 */
	Course.prototype.creCard = function (target) {
		var inforObj = target.courseObj.inforObj;
		var card = document.createElement('div');
		card.className = 'card';
		var img = document.createElement('img');
		card.appendChild(img);
		var detail = document.createElement('div');
		detail.className = 'detail';
		card.appendChild(detail);
		var name = document.createElement('h4');
		name.className = 'name';
		name.innerHTML = inforObj.name;
		var learner = document.createElement('span');
		learner.className = 'learnerCount';
		learner.innerHTML = inforObj.learnerCount + '人在学';
		var provider = document.createElement('p');
		provider.className = 'provider';
		provider.innerHTML = '发布者：' + inforObj.provider;
		var category = document.createElement('p');
		category.className = 'category';
		category.innerHTML = '分类：' + (inforObj.categoryName ? inforObj.categoryName : '');
		detail.appendChild(name);
		detail.appendChild(learner);
		detail.appendChild(provider);
		detail.appendChild(category);
		var description = document.createElement('p');
		description.className = 'description';
		description.innerHTML = inforObj.description;
		card.appendChild(description);
		target.appendChild(card);
	};
	/* 为course对象添加移除卡片方法 */
	Course.prototype.remvCard = function (target) {
		target.removeChild($('.card', target));
	};

	/* 处理获取课程列表时返回的数据 */
	function handleCourses (json) {		
		courses = document.createElement('div');
		courses.className = 'courses';
		coursesObj = JSON.parse(json);
		var len = coursesObj.list.length;
		for (var i = 0; i < len; i++) {
			new Course(coursesObj.list[i]);
		}
		content.appendChild(courses);
		addClass(content, 'courListed');
		if (tabChange === true) {
			new PageMod(coursesObj.totalPage, type);
			tabChange = false;
		}
	}
	/* 获取课程列表的API */
	function getCourses (pageNo, psize, type) {
		get("http://study.163.com/webDev/couresByCategory.htm", 
			{
				pageNo: pageNo, 
				psize: psize, 
				type: type
			},
			handleCourses);
	}

	/* 创建分页器的构造函数 */
	function PageMod (num, type) {
		var pageMod = document.createElement('div');
		pageMod.className = 'm-page';
		var pgUp = document.createElement('a');
		pgUp.className = 'pg_up';
		pgUp.innerHTML = '&lt;';
		pgUp.change = 'up'
		pageMod.appendChild(pgUp);
		for (var i = 1; i <= num; i++) {
			var page = document.createElement('a');
			page.className = (i === 1) ? 'page selected' : 'page';
			page.innerHTML = i + '';
			page.change = i;
			pageMod.appendChild(page);
		}
		var pgDown = document.createElement('a');
		pgDown.className = 'pg_down';
		pgDown.innerHTML = '&gt;';
		pgDown.change = 'down';
		pageMod.appendChild(pgDown);
		content.appendChild(pageMod);
		this.pageMod = pageMod;
		this.type = type;
		this.num = num;
		this.index = 1;
		this.addEvent();
	}
	/* 为分页器添加切换上一页方法 */
	PageMod.prototype.pgUp = function () {
		var index = this.index;
		if ((index > 1) && (index <= this.num)) {
			var page = this.pageMod.getElementsByTagName('a')[index];
			removeClass(page, 'selected');
			this.index = index - 1;
			page = this.pageMod.getElementsByTagName('a')[this.index];
			addClass(page, 'selected');
			if (courses) {
				content.removeChild(courses);
				removeClass(content, 'courListed');
			}
			getCourses(this.index, 20, this.type);
		}
	};
	/* 为分页器添加切换下一页方法 */
	PageMod.prototype.pgDown = function () {
		var index = this.index;
		if ((index >= 1) && (index < this.num)) {
			var page = this.pageMod.getElementsByTagName('a')[index];
			removeClass(page, 'selected');
			this.index = index + 1;
			page = this.pageMod.getElementsByTagName('a')[this.index];
			addClass(page, 'selected');			
			if (courses) {
				content.removeChild(courses);
				removeClass(content, 'courListed');
			}
			getCourses(this.index, 20, this.type);
		}
	};
	/* 为分页器添加切换任意一页方法 */
	PageMod.prototype.pgChange = function (target) {
		var index = this.index;
		if ((index >= 1) && (index <= this.num)) {
			var page = this.pageMod.getElementsByTagName('a')[index];
			removeClass(page, 'selected');
			addClass(target, 'selected');
			this.index = target.change;
			if (courses) {
				content.removeChild(courses);
				removeClass(content, 'courListed');
			}
			getCourses(this.index, 20, this.type);
		}
	};
	/* 为分页器添加注册事件方法 */
	PageMod.prototype.addEvent = function () {
		var clickHandler = function (event) {
			event = getEvent(event);
			var target = getTarget(event);
			if (target === this.pageMod) return;
			var change = target.change;
			if (change === 'up') {
				this.pgUp();
			} else if (change === 'down') {
				this.pgDown();
			} else {
				this.pgChange(target);
			}
		}.bind(this);
		addHandler(this.pageMod, 'click', clickHandler);
	};

	/* hotCour对象构造函数 */
	function HotCour (inforObj) {
		var hotCour = document.createElement('a');
		hotCour.className = 'm-hotCour';
		hotCour.title = inforObj.name;
		hotCour.hotCourObj = this;
		var img = document.createElement('img');
		img.className = 'avatar';
		img.style.backgroundImage = 'url(' + inforObj.smallPhotoUrl + ')';
		hotCour.appendChild(img);
		var infor = document.createElement('div');
		infor.className = 'infor';
		var name = document.createElement('h5');
		name.className = 'name';
		name.innerHTML = inforObj.name;
		var learner = document.createElement('span');
		learner.className = 'learnerCount';
		learner.innerHTML = inforObj.learnerCount;
		infor.appendChild(name);
		infor.appendChild(learner);
		hotCour.appendChild(infor);
		moveCont.appendChild(hotCour);
		this.hotCour = hotCour;
	}
	/* 处理获取热门推荐时返回的数据 */
	function handleHot (json) {		
		moveCont = document.createElement('div');
		moveCont.className = 'moveCont';
		moveCont.style.top = '0px';
		hotCourArr = JSON.parse(json);
		var len = hotCourArr.length;
		for (var i = 0; i < 10; i++) {
			new HotCour(hotCourArr[i]);
		}
		hotList.appendChild(moveCont);
		addClass(hotList, 'hotListed');
		/* 滚动热门课程 */
		var DURATION = 5000, 	// 热门课程停留时间5s
			INTERVAL = 10,		// 热门课程移动时间间隔10ms
			MOVETIME = 700,		// 热门课程移动时长700ms
			DISTANCE = 70;		// 每次滚动的距离为70px
		/* 开始滚动热门课程的函数 */
		var goMove = function (duration, interval, moveTime, distance) {
			var addCourse = function () {
				i = i % len;
				new HotCour(hotCourArr[i++]);
				moveCourse(duration, interval, moveTime, distance, function () {
					goMove(duration, interval, moveTime, distance);
				});
			};
			setTimeout(addCourse, duration);
		};
		goMove(DURATION, INTERVAL, MOVETIME, DISTANCE);
	}

	/* 为文档加载完添加事件 */
	addHandler(document, 'DOMContentLoaded', function (event) {		
		/* 处理顶部通知条 */
		var notify = $('#notify');
		if (getCookies().noAlert === 'true') {
			document.body.removeChild(notify);
		} else {
			var noAlert = function (event) {			
				document.body.removeChild(notify);
				setCookie('noAlert', 'true');
			};
			addHandler($('.no-alert', notify), 'click', noAlert);
		}	

		/* 处理关注按钮及登录表单 */	
		var cookie = getCookies();	
		var follow_log = $('#header .follow_log');
		follow = $('.follow', follow_log);
		if (cookie.followSuc === 'true') {
			follow.innerHTML = '已关注' + '<a class="unfollow">取消</a>';
			addClass(follow, 'followed');
			follow.disabled = true; 
			var unfollowHandler = function (event) {
				removeCookie('followSuc');
				follow.innerHTML = '+ 关注';
				removeClass(follow, 'followed');
				var enable = function () {
					follow.disabled = false;
				};
				setTimeout(enable, 300);    
			};
			addHandler($('.unfollow', follow), 'click', unfollowHandler);
		} else {
			var followHandler = function (event) {			
				if (cookie.loginSuc === 'true'){
					followAPI();
				} else {
					creLoginMod(loginValidate);
				}			
			};		
			addHandler(follow, 'click', followHandler);
		}

		/* 轮播图片 */
		var mSlides = $('.m-slides'),
			banCont = $('.bannerCont', mSlides),
			banList = $$('.banner', mSlides),
			shifCont = $('.shiftCont', mSlides),
			shifList = $$('.shift', shifCont);
		(function () {
			var PREV = 0,			// 前一张图片索引
				CURRENT = 0, 		// 当前图片索引
				NEXT = 1,			// 下一张图片索引
				NUM = 3, 			// 轮播图片数量
				DURATION = 5000, 	// 图片停留时间5s
				INTERVAL = 100,		// 图片淡入时间间隔100ms
				FADETIME = 500;		// 图片淡入时长500ms
			var counTime, timeoutId;
			/* 为每张图片添加zIndex */
			for (var i = 0; i < NUM; i++) {
				banList[i].style.zIndex = NUM - i;
			}
			/* 切换轮播图片的函数 */
			var shiftPic = function (duration, interval, fadeTime) {
				PREV = CURRENT;
				CURRENT = NEXT;
				NEXT = (NEXT + 1) % NUM;
				removeClass(shifList[PREV], 'shifted');
				addClass(shifList[CURRENT], 'shifted');
				/* 遍历每张图片，改变图片的zIndex */
				for (var i = 0; i < NUM; i++) {
					var zIndex = parseInt(banList[i].style.zIndex);
					if (zIndex < NUM) {
						zIndex++;
					} else {
						zIndex = zIndex - NUM + 1;
					}
					banList[i].style.zIndex = zIndex;
					banList[i].style.opacity = 0;
				}
				fadeIn(banList[CURRENT], interval, fadeTime, function () {
					   goPlay(duration, interval, fadeTime);	
				});
			}
			/* 开始轮播的函数 */
			var goPlay = function (duration, interval, fadeTime) {
				var num = 0,
					maxNum = duration/100;
				/* 该函数用于完成图片持续时间的计时 */
				counTime = function () {
					num++;
					if (num >= maxNum) {
						shiftPic(duration, interval, fadeTime);
					} else {
						timeoutId = setTimeout(counTime, 100);
					}				
				};
				timeoutId = setTimeout(counTime, 100);
			};			
			goPlay(DURATION, INTERVAL, FADETIME);
			/* 实现鼠标悬停于某图片，暂停切换 */
			addHandler(banCont, 'mouseenter', function (event) {
				clearTimeout(timeoutId);
			});
			addHandler(banCont, 'mouseleave', function (event) {
				timeoutId = setTimeout(counTime, 100);
			});
			/* 为切换图片的按钮添加点击事件 */
			var shifHandler = function (event) {
				event = getEvent(event);
				var target = getTarget(event);
				if (target === shifCont) return;
				var index = parseInt(target.dataset.index);
				if (index === CURRENT) return;
				clearTimeout(timeoutId);
				PREV = CURRENT;
				CURRENT = index;
				NEXT = (CURRENT + 1) % NUM;
				removeClass(shifList[PREV], 'shifted');
				addClass(target, 'shifted');
				banList[CURRENT].style.zIndex = NUM;
				banList[CURRENT].style.opacity = 0;
				var num = NUM;
				/* 改变剩下图片的z-index值 */
				for (var i = NEXT; i != CURRENT; i = (i + 1) % NUM) {
					num--;
					banList[i].style.opacity = 0;
					banList[i].style.zIndex = num;
				}
				fadeIn(banList[CURRENT], INTERVAL, FADETIME, function () {
					   goPlay(DURATION, INTERVAL, FADETIME);	
				});
			};
			addHandler(shifCont, 'click', shifHandler);
		})();

		/* 获取课程列表 */
		content = $('#main #content');
		getCourses(1, 20, type);

		/* 获取热门推荐 */
		hotList = $('#aside .hot_list');
		get('http://study.163.com/webDev/hotcouresByCategory.htm', {}, handleHot);	
		
		/* 为课程列表tab添加点击事件 */	
		var courseTab = $('.courses_tab', content),
		    desBtn = $('.design', courseTab);
		addClass(desBtn, 'choosed');
		desBtn.chosFlag = true;			// chosFlag为课程tab的选中属性
		var chooseHandler = function (event) {
			event = getEvent(event);
			var target = getTarget(event);
			if (target.chosFlag === true) return;
			tabChange = true;
			var tabList = courseTab.getElementsByTagName('button');
			for (var i = 0; i < tabList.length; i++) {
				var tab = tabList[i];
				if (tab === target) continue;
				if (tab.chosFlag === true) {
					removeClass(tab, 'choosed');
					tab.chosFlag = false;
					break;
				}
			}
			addClass(target, 'choosed');
			target.chosFlag = true;	
		    type = parseInt(target.id);
			if (courses) {
				content.removeChild(courses);
				content.removeChild($('.m-page', content));
				removeClass(content, 'courListed');
			}
			getCourses(1, 20, type);
		};
		addHandler(courseTab, 'click', chooseHandler);

		/* 为机构介绍视频添加点击事件 */
		var videoPlay = $('#aside .intro_video .play');
		var playHandler = function (event) {
			creVideoMod();
		};
		addHandler(videoPlay, 'click', playHandler);				
	});
})(app.util, app.EventUtil, app.cookie, app.ajax);





