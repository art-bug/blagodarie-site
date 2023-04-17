function get_api_url_() {
    if (typeof __API_URL__ === 'undefined') {
        return 'https://api.blagoroda.org';
    } else {
        return __API_URL__;
    }
}

// Возможные параметры, по группам параметров, в порядке их рассмотрения:
//
//  user_uuid_trusts    uuid пользователя
//                      все его (ее) связи доверия, а также связи доверия тех,
//                      кто ему (ей) доверял или не доверял
//
//  offer_uuid          ид опроса- предложения (offer) в телеграме, показ ответов,
//                      показ того, кто на что отвечал, связей доверия среди отвечавших
//
//  tg_poll_id          ид опроса телеграма, показ ответов,
//                      показ того, кто на что отвечал, связей доверия среди отвечавших
//
//  tg_group_chat_id    ид группы/канала в телеграме, показ связей доверия участников группы.
//                      если url начинается с 'group.', то ожидается tg_group_chat_id=
//
//  rod, dover, withalone
//      показ всех родственных связей и связей доверия
//          rod         (что-то не пустое)
//                      показ родственных связей, от родителя к потомку
//          dover       (что-то не пустое)
//                      показ связей доверия
//          withalone   (что-то не пустое)
//                      показ людей, у которых нет родственных связей (если задан rod) и/или
//                      нет связей доверия (если задан dover)
//
//  если не заданы параметры, то это соответствует вызову с /?rod=on&dover=&withalone=
//

function get_parm(parm) {

    // Получить get parameter
    // Если не было в строке parm=, возвращаем null
    // если было, то или '', или то что было

    var result = null;
    const got_parm = document.URL.match(new RegExp("[\\?\\&]" + parm + "\\=([A-Za-z_0-9\\-]+)?", "i"));
    if (got_parm) {
        result = got_parm[1] || '';
        if (result.match(/^\&/)) {
            result = '';
        }
    }    return result;
}

var parm_rod = '';
var parm_tg_poll_id = '';
var parm_offer_uuid = '';
var parm_user_uuid_trusts = '';

function link_color(link, format) {
    const color_relation = format == 'rgba' ? 'rgba(255, 232, 232, 0.8)' : '#ffe8e8';
    const color_poll = color_relation;
    const color_trust = format == 'rgba' ? 'rgba(54, 107, 13, 0.8)' : '#366b0d';
    const color_not_trust = format == 'rgba' ? 'rgba(250, 7, 24, 0.8)' : '#fa0718';
    if (link.is_poll || link.is_offer) {
        return color_poll;
    } else if (link.is_child && parm_rod) {
        return color_relation;
    } else if (link.is_trust) {
        return color_trust;
    } else {
        return color_not_trust;
    }
}

function main_() {

    const is_group_site = window.location.host.match(/^group\./);

    if (!document.URL.match(/\?/)) {
        window.location.assign(
            document.URL +
                (is_group_site ? '?tg_group_chat_id=0' : '?rod=on&dover=&withalone=')
        );
    }
    var parm_dover, parm_withalone;
    var parm_tg_group_chat_id = get_parm('tg_group_chat_id') || '';
    if (is_group_site && !parm_tg_group_chat_id) {
        parm_tg_group_chat_id = '?tg_group_chat_id=0';
    }
    if (parm_tg_group_chat_id) {
        //
    } else {
        parm_tg_poll_id = get_parm('tg_poll_id') || '';
        parm_offer_uuid = get_parm('offer_uuid') || '';
        parm_user_uuid_trusts = get_parm('user_uuid_trusts') || '';
        if (
            !parm_tg_poll_id &&
            !parm_offer_uuid &&
            !parm_user_uuid_trusts &&
            !parm_tg_group_chat_id
           ) {
            parm_rod = get_parm('rod') || '';
            parm_dover = get_parm('dover') || '';
            parm_withalone = get_parm('withalone') || '';
        }
    }
    const api_url = get_api_url_();
    var api_get_parms;
    if (parm_user_uuid_trusts) {
        api_get_parms =
            '/api/profile_graph?fmt=3d-force-graph&uuid=' + parm_user_uuid_trusts;
    } else if (parm_offer_uuid) {
        api_get_parms =
            '/api/offer/results/?offer_uuid=' + parm_offer_uuid;
    } else if (parm_tg_poll_id) {
        api_get_parms =
            '/api/bot/poll/results/?tg_poll_id=' + parm_tg_poll_id;
    } else if (parm_tg_group_chat_id) {
        api_get_parms =
            '/api/getstats/user_connections_graph?fmt=3d-force-graph' +
            '&number=0' +
            '&tg_group_chat_id=' + parm_tg_group_chat_id;
    } else {
        api_get_parms =
            '/api/profile_genesis/all?fmt=3d-force-graph' +
            '&withalone=' + parm_withalone +
            '&dover=' + parm_dover +
            '&rod=' + parm_rod;
    }
    $.ajax({
        url: api_url  + api_get_parms,
        dataType: 'json',
        success: function(data) {
            if ((parm_tg_poll_id || parm_offer_uuid) && data.question) {
                document.title = 'Опрос: ' + data.question;
            }
            const photoTextureUnknown = new THREE.TextureLoader().load(`./images/star.jpeg`);
            const Graph = ForceGraph3D()
            (document.getElementById('3d-graph'))
            .nodeThreeObject(({ id, photo }) => {
                var photoTexture;
                if (photo) {
                    photoTexture = new THREE.TextureLoader().load(photo);
                } else {
                    photoTexture = photoTextureUnknown;
                }
                const material = new THREE.SpriteMaterial({ map: photoTexture });
                const sprite = new THREE.Sprite(material);
                sprite.scale.set(25, 25);
                return sprite;
            })
            .graphData(data)
            // Если есть и родственная связь, и доверие, и если задано
            // искать родственные связи, то показываем стрелку цвета родственной связи
            .linkColor(link => link_color(link, 'rgb'))
            .linkOpacity(0.8)
            .linkCurvature(0.25)
            .nodeLabel(node => `${node.first_name}`)
            .onNodeClick(function(node){
                if (node.uuid && data.bot_username) {
                    window.location.href = "https://t.me/" + data.bot_username + '?start=' + node.uuid;
                }
            })

            .linkDirectionalArrowLength(10)
            .linkDirectionalArrowRelPos(1)
            .linkDirectionalArrowColor(link => link_color(link, 'rgba'))
            ;
            if (!parm_tg_poll_id && !parm_offer_uuid) {
                Graph.d3Force('charge').strength(-320);
            }
        }
    });
}

$(function() {
    main_();
});
