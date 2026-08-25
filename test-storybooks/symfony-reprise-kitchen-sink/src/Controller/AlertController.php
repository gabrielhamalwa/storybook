<?php

declare(strict_types=1);

namespace App\Controller;

use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class AlertController
{
    #[Route('/_fragment/alert', name: 'storybook_alert_fragment')]
    public function fragment(Request $request): Response
    {
        $message = $request->query->get('message', 'Controller fragment');

        return new Response(sprintf(
            '<div class="alert alert-warning">%s</div>',
            htmlspecialchars($message, \ENT_QUOTES | \ENT_HTML5)
        ));
    }
}
