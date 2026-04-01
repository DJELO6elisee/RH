import product1Image from 'assets/img/products/product_640-1.jpg';
import product2Image from 'assets/img/products/product_640-2.jpg';
import product3Image from 'assets/img/products/product_640-3.jpg';
import product4Image from 'assets/img/products/product_640-4.jpg';
import product5Image from 'assets/img/products/product_640-5.jpg';
import product6Image from 'assets/img/products/product_640-6.jpg';

import user1Image from 'assets/img/users/100_1.jpg';
import user2Image from 'assets/img/users/100_2.jpg';
import user3Image from 'assets/img/users/100_3.jpg';
import user4Image from 'assets/img/users/100_4.jpg';
import user5Image from 'assets/img/users/100_5.jpg';
import user6Image from 'assets/img/users/100_6.jpg';
import user7Image from 'assets/img/users/100_7.jpg';
import user8Image from 'assets/img/users/100_8.jpg';
import user9Image from 'assets/img/users/100_9.jpg';
import user10Image from 'assets/img/users/100_10.jpg';
import user11Image from 'assets/img/users/100_11.jpg';
import user12Image from 'assets/img/users/100_12.jpg';
import user13Image from 'assets/img/users/100_13.jpg';
import user14Image from 'assets/img/users/100_14.jpg';

export const productsData = [{
        id: 1,
        image: product1Image,
        title: 'Formation Management',
        description: 'Gestion des formations et compétences...',
        right: '15 agents',
    },
    {
        id: 2,
        image: product2Image,
        title: 'Planning Congés',
        description: 'Gestion des congés et absences...',
        right: '8 autorisations',
    },
    {
        id: 3,
        image: product3Image,
        title: 'Évaluations',
        description: 'Système d\'évaluation du personnel...',
        right: '12 en cours',
    },
    {
        id: 4,
        image: product4Image,
        title: 'Recrutement',
        description: 'Plus de 50+ candidatures en cours...',
        right: '5 postes',
    },
    {
        id: 5,
        image: product5Image,
        title: 'Paie',
        description: 'Gestion de la paie mensuelle...',
        right: '120 agents',
    },
    {
        id: 6,
        image: product6Image,
        title: 'Planning',
        description: 'Organisation des plannings...',
        right: '3 services',
    },
];

export const avatarsData = [{
        avatar: user1Image,
        name: 'Marie Dubois',
        date: 'il y a 3 mois',
    },
    {
        avatar: user2Image,
        name: 'Jean Martin',
        date: 'il y a 1 an',
    },
    {
        avatar: user3Image,
        name: 'Sophie Leroy',
        date: 'il y a 2 heures',
    },
    {
        avatar: user4Image,
        name: 'Christine Moreau',
        date: 'il y a 1 mois',
    },
    {
        avatar: user5Image,
        name: 'Pierre Bernard',
        date: 'il y a 6 mois',
    },
    {
        avatar: user6Image,
        name: 'Daniel Petit',
        date: 'il y a 2 ans',
    },
    {
        avatar: user7Image,
        name: 'Merry Johnson',
        date: 'il y a 3 mois',
    },
    {
        avatar: user8Image,
        name: 'Jean Dupont',
        date: 'il y a 1 mois',
    },
    {
        avatar: user9Image,
        name: 'Shane Wilson',
        date: 'il y a 7 mois',
    },
    {
        avatar: user10Image,
        name: 'Stéphanie Roy',
        date: 'il y a 1 an',
    },
    {
        avatar: user11Image,
        name: 'Jennifer Smith',
        date: 'il y a 3 mois',
    },
    {
        avatar: user12Image,
        name: 'Park Lee',
        date: 'il y a 4 mois',
    },
    {
        avatar: user13Image,
        name: 'David Brown',
        date: 'il y a 9 mois',
    },
    {
        avatar: user14Image,
        name: 'Jackson Taylor',
        date: 'il y a 10 mois',
    },
];

export const userProgressTableData = [{
        avatar: user1Image,
        name: 'Marie Dubois',
        date: 'il y a 3 mois',
        progress: 75,
    },
    {
        avatar: user2Image,
        name: 'Jean Martin',
        date: 'il y a 1 an',
        progress: 60,
    },
    {
        avatar: user3Image,
        name: 'Sophie Leroy',
        date: 'il y a 2 heures',
        progress: 50,
    },
    {
        avatar: user4Image,
        name: 'Christine Moreau',
        date: 'il y a 1 mois',
        progress: 40,
    },
    {
        avatar: user5Image,
        name: 'Pierre Bernard',
        date: 'il y a 6 mois',
        progress: 30,
    },
    {
        avatar: user6Image,
        name: 'Daniel Petit',
        date: 'il y a 2 ans',
        progress: 25,
    },
];

export const supportTicketsData = [{
        id: 1,
        avatar: user1Image,
        name: 'Sophie Leroy',
        date: 'il y a 30 min',
        text: 'Demande de congés pour la semaine prochaine. Besoin d\'une validation urgente pour un rendez-vous médical.',
        status: 'pending',
    },
    {
        id: 2,
        avatar: user2Image,
        name: 'Jean Martin',
        date: 'il y a 1 heure',
        text: 'Question sur la formation en management prévue le mois prochain. Souhaite connaître les modalités d\'inscription.',
        status: 'open',
    },

];

export const todosData = [
    { id: 1, title: 'Valider les autorisations de congés', done: true },
    { id: 2, title: 'Planifier les entretiens annuels', done: false },
    { id: 3, title: 'Mettre à jour les fiches de paie', done: true },
    { id: 4, title: 'Organiser la formation sécurité', done: true },
    { id: 5, title: 'Recruter 2 développeurs', done: false },
];

export const chartjs = {
    bar: {
        data: {
            labels: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet'],
            datasets: [{
                    label: 'Formations cette année',
                    backgroundColor: '#6a82fb',
                    stack: 'Formations',
                    data: [10, 30, 50, 80, 60, 20, 10],
                },
                {
                    label: 'Formations l\'année dernière',
                    backgroundColor: '#fc5c7d',
                    stack: 'Formations',
                    data: [30, 80, 50, 100, 60, 40, 90],
                },
            ],
        },
        options: {
            plugins: {
                title: {
                    display: false,
                    text: 'Chart.js Bar Chart - Stacked',
                },
                legend: {
                    display: false,
                },
            },
            interaction: {
                mode: 'index',
                intersect: false,
            },
            responsive: true,
            scales: {
                x: {
                    stacked: true,
                    display: false,
                },
                y: {
                    stacked: true,
                    display: false,
                },
            },
        },
    },
    doughnut: {
        data: {
            datasets: [{
                data: [20, 30, 40, 50, 60],
                backgroundColor: [
                    '#6a82fb',
                    '#fc5c7d',
                    '#45b649',
                    '#00c9ff',
                    '#ffd700',
                ],
                label: 'Dataset 1',
            }, ],
            labels: ['Red', 'Orange', 'Yellow', 'Green', 'Blue'],
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false,
                },
                title: {
                    display: false,
                    text: 'Chart.js Doughnut Chart',
                },
            },
            animation: {
                animateScale: true,
                animateRotate: true,
            },
        },
    },
    line: {
        data: {
            labels: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet'],
            datasets: [{
                    label: 'Recrutements cette année',
                    borderColor: '#6a82fb',
                    backgroundColor: '#6a82fb',
                    data: [0, 13, 22, 34, 46, 35, 30],
                    tension: 0.4,
                },
                {
                    label: 'Recrutements l\'année dernière',
                    borderColor: '#fc5c7d',
                    backgroundColor: '#fc5c7d',
                    data: [0, 13, 22, 34, 46, 35, 30],
                    tension: 0.4,
                },
            ],
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false,
                },
                title: {
                    display: false,
                    text: 'Chart.js Line Chart - Stacked Area',
                },
            },
            interaction: {
                intersect: false,
                mode: 'nearest',
            },
            hover: {
                mode: 'index',
            },
            scales: {
                x: {
                    stacked: true,
                    title: {
                        display: false,
                        text: 'Mois',
                    },
                    grid: {
                        display: false,
                    },
                },
                y: {
                    stacked: true,
                    title: {
                        display: false,
                        text: 'Valeur',
                    },
                    grid: {
                        display: false,
                    },
                },
            },
        },
    },
};
