import { Show } from './interface';
import { parseDate } from '@/utils/parse-date';
import timezone from '@/utils/timezone';
import dayjs from 'dayjs';

function getDate(t: number) {
    return timezone(parseDate(t, 'X'), +8);
}

function formatDate(t: number) {
    const date = getDate(t);
    return dayjs(date).format('YYYY-MM-DD');
}

export const render = (show: Show) => {
    const descriptionParts = [
        show.poster ? `<img src="https://www.livestart.com.cn/api/v1/poster/${show.poster}" />` : '',
        show.showTime ? `<p>演出时间：${formatDate(show.showTime)}</p>` : '',
        show.city || show.site ? `<p>地址：${[show.city, show.site].filter(Boolean).join(' - ')}</p>` : '',
        show.performers ? `<p>艺人：${show.performers}</p>` : '',
        show.prices ? `<p>价格：${show.prices}</p>` : '',
    ];

    return descriptionParts.filter(Boolean).join('');
};
