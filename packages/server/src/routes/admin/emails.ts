import { SubPath } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { RouteType } from '../../utils/types';
import { AppContext } from '../../utils/types';
import defaultView from '../../utils/defaultView';
import { makeTablePagination, makeTableView, Row, Table } from '../../utils/views/table';
import { PaginationOrderDir } from '../../models/utils/pagination';
import { formatDateTime } from '../../utils/time';
import { adminEmailsUrl, adminEmailUrl, adminUserUrl } from '../../utils/urlUtils';
import { createCsrfTag } from '../../utils/csrf';
import { senderInfo } from '../../models/utils/email';
import { _ } from '@joplin/lib/locale';
import { View } from '../../services/MustacheService';
import { markdownBodyToHtml } from '../../services/email/utils';

const router: Router = new Router(RouteType.Web);

router.get('admin/emails', async (_path: SubPath, ctx: AppContext) => {
	const models = ctx.joplin.models;
	const pagination = makeTablePagination(ctx.query, 'created_time', PaginationOrderDir.DESC);
	const page = await models.email().allPaginated(pagination);
	const users = await models.user().loadByIds(page.items.map(e => e.recipient_name));

	const table: Table = {
		baseUrl: adminEmailsUrl(),
		requestQuery: ctx.query,
		pageCount: page.page_count,
		pagination,
		headers: [
			{
				name: 'id',
				label: 'ID',
			},
			{
				name: 'sender_id',
				label: 'From',
			},
			{
				name: 'recipient_name',
				label: 'To',
			},
			{
				name: 'user_id',
				label: 'User',
			},
			{
				name: 'subject',
				label: 'Subject',
			},
			{
				name: 'created_time',
				label: 'Created',
			},
			{
				name: 'sent_time',
				label: 'Sent',
			},
			{
				name: 'error',
				label: 'Error',
			},
		],
		rows: page.items.map(d => {
			const sender = senderInfo(d.sender_id);
			const senderName = sender.name || sender.email || `Sender ${d.sender_id.toString()}`;

			let error = '';
			if (d.sent_time && !d.sent_success) {
				error = d.error ? d.error : '(Unspecified error)';
			}

			const row: Row = [
				{
					value: d.id.toString(),
				},
				{
					value: senderName,
					url: sender.email ? `mailto:${escape(sender.email)}` : '',
				},
				{
					value: d.recipient_name || d.recipient_email,
					url: `mailto:${escape(d.recipient_email)}`,
				},
				{
					value: d.recipient_id ? (users.find(u => u.id === d.recipient_id)?.email || '(not set)') : '-',
					url: d.recipient_id ? adminUserUrl(d.recipient_id) : '',
				},
				{
					value: d.subject,
					url: adminEmailUrl(d.id),
				},
				{
					value: formatDateTime(d.created_time),
				},
				{
					value: formatDateTime(d.sent_time),
				},
				{
					value: error,
				},

			];

			return row;
		}),
	};

	const view: View = {
		...defaultView('admin/emails', _('Emails')),
		content: {
			emailTable: makeTableView(table),
			csrfTag: await createCsrfTag(ctx),
		},
	};

	return view;
});

router.get('admin/emails/:id', async (path: SubPath, ctx: AppContext) => {
	const models = ctx.joplin.models;

	const email = await models.email().load(path.id);

	const view: View = {
		...defaultView('admin/email', _('Email')),
		content: {
			email,
			sender: senderInfo(email.sender_id),
			bodyHtml: markdownBodyToHtml(email.body),
		},
	};

	return view;
});

export default router;
